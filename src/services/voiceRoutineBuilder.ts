import { RoutineAction, SkillEntity, RoutineTriggerEntity } from '../types';
import { glinerAgent } from './glinerAgent';
import { storage } from './storage';
import { soundAndHaptics } from './soundAndHaptics';

export interface VoiceRoutineBuildResult {
  isRoutineCreation: boolean;
  skillName?: string;
  timeSchedule?: string;
  actionsCount?: number;
  message?: string;
}

class VoiceRoutineBuilder {
  /**
   * Detects if the user query contains a scheduling request or routine definition,
   * e.g. "Włącz Bluetooth, ustaw głośność na 80% i otwórz Spotify o godzinie 18"
   */
  checkAndBuildRoutineFromVoice(userText: string): VoiceRoutineBuildResult {
    const trimmed = userText.trim();
    const lower = trimmed.toLowerCase();

    // Check for time schedule expression: "o godzinie 18", "o 18:00", "o 18", "o godz. 7:30"
    const timeMatch = /(?:o\s+godzinie|o\s+godz\.?|o)\s*(\d{1,2})(?::(\d{2}))?\s*(?:rano|wieczorem|w\s+nocy|po\s+południu)?/i.exec(
      trimmed
    );

    const isExplicitRoutineCommand =
      lower.startsWith('stwórz rutynę') ||
      lower.startsWith('stworz rutyne') ||
      lower.startsWith('zaplanuj rutynę') ||
      lower.startsWith('zaplanuj rutyne') ||
      lower.startsWith('zapisz jako skill') ||
      lower.startsWith('dodaj rutynę');

    if (!timeMatch && !isExplicitRoutineCommand) {
      return { isRoutineCreation: false };
    }

    let timeSchedule: string | undefined = undefined;
    let cleanText = trimmed;

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (lower.includes('wieczorem') || lower.includes('po południu')) {
        if (hours < 12) hours += 12;
      }
      timeSchedule = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Remove the time phrase from the text so we only parse the actions
      cleanText = trimmed.replace(timeMatch[0], '').trim();
    }

    // Strip prefix if explicit
    cleanText = cleanText
      .replace(/^(?:stwórz|stworz|zaplanuj|zapisz|dodaj)\s+(?:rutynę|rutyne|skill)?(?:\s+o\s+nazwie|\s+nazwaną)?\s*[:,-]?\s*/i, '')
      .trim();

    if (!cleanText) {
      return { isRoutineCreation: false };
    }

    // Parse sub-actions via glinerAgent
    const plan = glinerAgent.processCommand(cleanText);
    const routineActions: RoutineAction[] = [];

    plan.subIntents.forEach((sub) => {
      switch (sub.intentType) {
        case 'TOGGLE_HARDWARE': {
          const hw = sub.entities.find((e) => e.label === 'hardware_toggle')?.value || 'bluetooth';
          const state = sub.entities.find((e) => e.label === 'setting_value')?.value || 'on';
          routineActions.push({
            type: 'TOGGLE_HARDWARE',
            parameter1: hw,
            parameter2: state
          });
          break;
        }
        case 'SET_VOLUME': {
          const vol = sub.entities.find((e) => e.label === 'setting_value')?.value || '80';
          routineActions.push({
            type: 'SET_VOLUME',
            parameter1: vol
          });
          break;
        }
        case 'SET_BRIGHTNESS': {
          const bri = sub.entities.find((e) => e.label === 'setting_value')?.value || '80';
          routineActions.push({
            type: 'SET_BRIGHTNESS',
            parameter1: bri
          });
          break;
        }
        case 'OPEN_APPLICATION': {
          const app = sub.entities.find((e) => e.label === 'target_app')?.value || 'Aplikacja';
          routineActions.push({
            type: 'OPEN_APP',
            parameter1: app
          });
          break;
        }
        case 'CLICK_NODE': {
          const node = sub.entities.find((e) => e.label === 'setting_name')?.value || '';
          if (node) {
            routineActions.push({
              type: 'CLICK_NODE',
              parameter1: node
            });
          }
          break;
        }
        case 'SWIPE_SCREEN': {
          const dir = sub.entities.find((e) => e.label === 'setting_value')?.value || 'down';
          routineActions.push({
            type: 'SWIPE_SCREEN',
            parameter1: dir
          });
          break;
        }
        case 'SET_DND': {
          const state = sub.entities.find((e) => e.label === 'setting_value')?.value || 'on';
          routineActions.push({
            type: 'SET_DND',
            parameter1: state
          });
          break;
        }
        case 'SET_TIMER': {
          const sec = sub.entities.find((e) => e.label === 'setting_value')?.value || '300';
          routineActions.push({
            type: 'SET_TIMER',
            parameter1: sec
          });
          break;
        }
        default:
          break;
      }
    });

    if (routineActions.length === 0) {
      return { isRoutineCreation: false };
    }

    // Auto-generate concise Polish skill name based on actions and schedule
    const appAction = routineActions.find((a) => a.type === 'OPEN_APP');
    const hwAction = routineActions.find((a) => a.type === 'TOGGLE_HARDWARE');

    let skillName = 'Rutyna automatyczna';
    if (appAction && hwAction) {
      skillName = `${hwAction.parameter1 === 'bluetooth' ? 'Bluetooth' : 'Latarka'} & ${appAction.parameter1}`;
    } else if (appAction) {
      skillName = `Uruchomienie ${appAction.parameter1}`;
    } else if (hwAction) {
      skillName = `Konfiguracja sprzętu`;
    }

    if (timeSchedule) {
      skillName += ` (${timeSchedule})`;
    }

    // Save skill into storage
    const newSkill: SkillEntity = {
      id: Date.now(),
      name: skillName,
      actionsJson: JSON.stringify(routineActions),
      createdAt: Date.now()
    };

    const existingSkills = storage.getSkills();
    storage.saveSkills([newSkill, ...existingSkills]);

    // If time schedule exists, save trigger into storage
    if (timeSchedule) {
      const newTrigger: RoutineTriggerEntity = {
        id: Date.now() + 1,
        triggerType: 'TIME_SCHEDULE',
        associatedSkillName: skillName,
        enabled: true,
        timeSchedule,
        daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      };
      const existingTriggers = storage.getTriggers();
      storage.saveTriggers([newTrigger, ...existingTriggers]);
    }

    soundAndHaptics.playSuccessChime();

    const actionSummaries = routineActions.map((a) => {
      if (a.type === 'TOGGLE_HARDWARE') return `${a.parameter1} (${a.parameter2 || 'włącz'})`;
      if (a.type === 'SET_VOLUME') return `głośność ${a.parameter1}%`;
      if (a.type === 'SET_BRIGHTNESS') return `jasność ${a.parameter1}%`;
      if (a.type === 'OPEN_APP') return `otwórz ${a.parameter1}`;
      if (a.type === 'CLICK_NODE') return `kliknij ${a.parameter1}`;
      if (a.type === 'SWIPE_SCREEN') return `przewiń ekran (${a.parameter1})`;
      return a.type;
    });

    const scheduleMsg = timeSchedule
      ? `zaplanowaną codziennie o godzinie ${timeSchedule}`
      : 'gotową do uruchomienia';

    const confirmationMsg = `Pomyślnie utworzono rutynę „${skillName}” ${scheduleMsg}. Sekwencja zawiera ${routineActions.length} akcji: ${actionSummaries.join(', ')}.`;

    return {
      isRoutineCreation: true,
      skillName,
      timeSchedule,
      actionsCount: routineActions.length,
      message: confirmationMsg
    };
  }
}

export const voiceRoutineBuilder = new VoiceRoutineBuilder();
