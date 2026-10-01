import { ScreenInspectionData, ScreenNode } from '../types';
import { soundAndHaptics } from './soundAndHaptics';

class ScreenInspector {
  /**
   * Scans visible elements on the screen, extracting OCR text, interactive nodes, and coordinates
   */
  inspectCurrentScreen(): ScreenInspectionData {
    if (typeof document === 'undefined') {
      return {
        timestamp: Date.now(),
        appTitle: 'CogniAgent v2',
        fullOcrText: '',
        nodes: [],
        summary: 'Brak dostępnego środowiska DOM.'
      };
    }

    const appTitle = document.title || 'CogniAgent v2 (Huawei EMUI 10)';
    const nodes: ScreenNode[] = [];
    const textPieces: string[] = [];

    // Target elements: buttons, headings, inputs, links, readable paragraphs
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        'h1, h2, h3, button, input, textarea, a, [role="button"], p'
      )
    );

    let nodeIdx = 1;
    elements.forEach((el) => {
      // Check visibility
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return;
      }

      const rawText = el.innerText || (el as HTMLInputElement).value || (el as HTMLInputElement).placeholder || '';
      const text = rawText.trim();
      if (!text || text.length > 300) return;

      let type: ScreenNode['type'] = 'text';
      const tag = el.tagName.toLowerCase();
      const isClickable =
        tag === 'button' ||
        tag === 'a' ||
        el.getAttribute('role') === 'button' ||
        el.onclick !== null ||
        style.cursor === 'pointer';

      if (tag.startsWith('h')) type = 'heading';
      else if (tag === 'button' || el.getAttribute('role') === 'button') type = 'button';
      else if (tag === 'input' || tag === 'textarea') type = 'input';
      else if (tag === 'a') type = 'link';

      nodes.push({
        id: `node-${nodeIdx++}`,
        type,
        text,
        clickable: isClickable,
        bounds: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      });

      if (!textPieces.includes(text)) {
        textPieces.push(text);
      }
    });

    const fullOcrText = textPieces.join('\n');
    const summary = this.generateSummary(nodes, textPieces);

    return {
      timestamp: Date.now(),
      appTitle,
      fullOcrText,
      nodes: nodes.slice(0, 30), // Top 30 visible nodes
      summary
    };
  }

  private generateSummary(nodes: ScreenNode[], textPieces: string[]): string {
    const buttonCount = nodes.filter((n) => n.clickable).length;
    const headings = nodes
      .filter((n) => n.type === 'heading')
      .map((n) => n.text)
      .slice(0, 3);

    const headingStr = headings.length > 0 ? ` Sekcje główne: ${headings.join(' | ')}.` : '';
    return `Na bieżącym ekranie wykryto ${nodes.length} elementów tekstowych i interfejsowych (${buttonCount} przycisków/akcji).${headingStr}`;
  }

  /**
   * Translates or clarifies screen text for the user
   */
  translateOrExplainScreen(): string {
    const inspection = this.inspectCurrentScreen();
    soundAndHaptics.playSuccessChime();
    return `Analiza OCR ekranu (${inspection.appTitle}): ${inspection.summary}\nKluczowa treść: ${inspection.fullOcrText.slice(0, 250)}...`;
  }

  /**
   * Captures the full external Android/desktop screen using browser Screen Capture (MediaProjection API)
   * This allows inspecting the phone launcher desktop or any other open application.
   */
  async captureRealDeviceScreen(): Promise<ScreenInspectionData> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen Capture API (MediaProjection) nie jest obsługiwane w tej przeglądarce.');
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: false
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      // Render frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const screenshotDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Stop tracks immediately
      stream.getTracks().forEach((track) => track.stop());

      soundAndHaptics.playSuccessChime();

      return {
        timestamp: Date.now(),
        appTitle: 'Pulpit Androida / Zewnętrzna Aplikacja (MediaProjection)',
        fullOcrText: `Pomyślnie przechwycono zewnętrzny ekran urządzenia (${canvas.width}x${canvas.height} px).\nWidok obejmuje pulpit telefonu, pasek powiadomień lub aktualnie uruchomioną aplikację.`,
        nodes: [
          {
            id: 'ext-node-1',
            type: 'image',
            text: `Przechwycony zewnętrzny ekran (${canvas.width}x${canvas.height})`,
            clickable: false,
            bounds: { x: 0, y: 0, width: canvas.width, height: canvas.height }
          }
        ],
        summary: `Przechwycono rzeczywisty obraz zewnętrznego ekranu telefonu (${canvas.width}x${canvas.height} px) za pomocą MediaProjection.`,
        screenshotDataUrl,
        isExternalAppCapture: true
      };
    } catch (e: any) {
      throw new Error(`Anulowano lub odrzucono przechwytywanie ekranu: ${e.message || e}`);
    }
  }

  /**
   * Simulates clicking an identified UI node by clicking the corresponding DOM element
   */
  clickNodeByText(text: string): boolean {
    const trimmed = text.toLowerCase().trim();
    const elements = Array.from(document.querySelectorAll<HTMLElement>('button, a, [role="button"], input'));
    const matched = elements.find((el) => {
      const t = (el.innerText || (el as HTMLInputElement).value || '').toLowerCase();
      return t.includes(trimmed);
    });

    if (matched) {
      soundAndHaptics.triggerHaptic(30);
      matched.click();
      return true;
    }
    return false;
  }
}

export const screenInspector = new ScreenInspector();
