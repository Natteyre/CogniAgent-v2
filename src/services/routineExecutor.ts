import { ActionType, RoutineAction } from '../types';
import { hardwareManager } from './hardwareManager';
import { ttsManager } from './ttsManager';

export class RoutineExecutor {
  async executeActionsJson(
    actionsJson: string,
    onProgress?: (msg: string) => void
  ): Promise<void> {
    try {
      const actions: RoutineAction[] = JSON.parse(actionsJson);
      await this.executeActions(actions, onProgress);
    } catch (e: any) {
      console.error('Failed to parse and execute routine actions', e);
      ttsManager.speak('Wystąpił błąd podczas wykonywania sekwencji rutyny.');
    }
  }

  async executeActions(
    actions: RoutineAction[],
    onProgress?: (msg: string) => void
  ): Promise<void> {
    for (let index = 0; index < actions.length; index++) {
      const action = actions[index];
      const logMsg = `Krok ${index + 1}/${actions.length}: ${action.type} -> ${action.parameter1}`;
      console.log(logMsg);
      onProgress?.(logMsg);

      switch (action.type) {
        case 'SPEAK': {
          if (action.parameter1) {
            await new Promise<void>((resolve) => {
              ttsManager.speak(action.parameter1, () => resolve());
              // Timeout safety in case speech synthesis fails or is blocked
              setTimeout(resolve, 2500);
            });
            await this.delay(400);
          }
          break;
        }

        case 'OPEN_APP': {
          const pkg = action.parameter1.trim();
          console.log(`Uruchamianie aplikacji / modułu: ${pkg}`);
          await this.delay(500);
          break;
        }

        case 'DELAY': {
          const ms = parseInt(action.parameter1, 10) || 1000;
          await this.delay(Math.min(30000, Math.max(50, ms)));
          break;
        }

        case 'CLICK_NODE': {
          const text = action.parameter1.trim().toLowerCase();
          const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
          const target = buttons.find((btn) => btn.textContent?.toLowerCase().includes(text));
          if (target && target instanceof HTMLElement) {
            target.click();
          }
          await this.delay(300);
          break;
        }

        case 'TOGGLE_HARDWARE': {
          const target = action.parameter1.toLowerCase();
          const state = (action.parameter2 || 'on').toLowerCase();
          const isEnable = state === 'on' || state === 'true' || state === '1' || state === 'włącz';

          if (target.includes('torch') || target.includes('latark') || target.includes('diod')) {
            await hardwareManager.setTorch(isEnable);
          } else if (target.includes('bluetooth') || target.includes('bt')) {
            hardwareManager.setBluetooth(isEnable);
          }
          await this.delay(300);
          break;
        }

        case 'SWIPE_SCREEN': {
          const direction = action.parameter1.toLowerCase().trim();
          const scrollAmount = 350;
          if (direction === 'up' || direction === 'góra') {
            window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          }
          await this.delay(400);
          break;
        }

        case 'TAP_COORDINATE': {
          const coords = action.parameter1.split(/[,;\s]+/).map((v) => parseFloat(v));
          if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            const el = document.elementFromPoint(coords[0], coords[1]);
            if (el && el instanceof HTMLElement) {
              el.click();
            }
          }
          await this.delay(300);
          break;
        }

        case 'SUMMARIZE_SCREEN': {
          const text = document.body.innerText.slice(0, 300);
          ttsManager.speak(`Podsumowanie ekranu: ${text.slice(0, 100)}...`);
          await this.delay(1000);
          break;
        }

        case 'SET_TIMER': {
          const seconds = parseInt(action.parameter1, 10) || 300;
          const label = action.parameter2 || 'CogniAgent Minutnik';
          hardwareManager.setTimer(seconds, label);
          ttsManager.speak(`Ustawiono minutnik na ${Math.round(seconds / 60)} minut.`);
          await this.delay(500);
          break;
        }

        case 'SET_ALARM': {
          const timeParts = action.parameter1.split(/[:.-]/);
          const hour = parseInt(timeParts[0] || '7', 10);
          const min = parseInt(timeParts[1] || '0', 10);
          const label = action.parameter2 || 'CogniAgent Budzik';
          hardwareManager.setAlarm(hour, min, label);
          ttsManager.speak(`Ustawiono budzik na godzinę ${hour}:${min.toString().padStart(2, '0')}.`);
          await this.delay(500);
          break;
        }

        case 'SET_VOLUME': {
          const vol = parseInt(action.parameter1, 10) || 50;
          hardwareManager.setDeviceVolume(vol);
          ttsManager.speak(`Ustawiono głośność na ${vol} procent.`);
          await this.delay(400);
          break;
        }

        case 'SET_BRIGHTNESS': {
          const b = parseInt(action.parameter1, 10) || 50;
          hardwareManager.setBrightness(b);
          ttsManager.speak(`Ustawiono jasność ekranu na ${b} procent.`);
          await this.delay(300);
          break;
        }

        case 'SET_DND': {
          const state = (action.parameter1 || 'on').toLowerCase();
          const isEnable = state === 'on' || state === 'true' || state === '1' || state === 'włącz';
          hardwareManager.setDndMode(isEnable);
          ttsManager.speak(`Tryb Nie Przeszkadzać został ${isEnable ? 'aktywowany' : 'wyłączony'}.`);
          await this.delay(300);
          break;
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const routineExecutor = new RoutineExecutor();
