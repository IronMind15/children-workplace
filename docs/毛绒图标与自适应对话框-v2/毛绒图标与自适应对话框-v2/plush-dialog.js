(function () {
  const scriptElement = document.currentScript;
  const componentBaseUrl = scriptElement?.src
    ? new URL(".", scriptElement.src)
    : new URL(".", document.baseURI);

  if (!document.querySelector("link[data-plush-dialog-fonts]")) {
    const fontStylesheet = document.createElement("link");
    fontStylesheet.rel = "stylesheet";
    fontStylesheet.href = new URL("fonts/fonts.css", componentBaseUrl).href;
    fontStylesheet.dataset.plushDialogFonts = "";
    document.head.append(fontStylesheet);
  }

  class PlushDialog extends HTMLElement {
    static get observedAttributes() {
      return ["placeholder", "min-width", "max-width", "font-size", "tail", "tone"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            --navy: #123557;
            --navy-deep: #0a2742;
            --felt: #f6d89a;
            --felt-light: #ffedbd;
            --stitch: #bd8431;
            --gold: #efb83f;
            --dialog-font: "Smiley Sans", "得意黑", "LXGW WenKai", "霞鹜文楷", "Noto Sans SC", "Microsoft YaHei", sans-serif;
            display: inline-block;
            max-width: 100%;
            vertical-align: top;
          }

          .bubble {
            --adaptive-radius: 26px;
            position: relative;
            box-sizing: border-box;
            width: 180px;
            min-height: 76px;
            padding: 22px 30px;
            border: 8px solid var(--navy);
            border-radius: var(--adaptive-radius);
            color: #50391f;
            background:
              radial-gradient(circle at 14% 20%, rgb(255 255 255 / 35%) 0 1px, transparent 2px),
              radial-gradient(circle at 72% 63%, rgb(130 83 27 / 10%) 0 1px, transparent 2px),
              linear-gradient(145deg, var(--felt-light), var(--felt));
            background-size: 13px 13px, 17px 17px, 100% 100%;
            box-shadow:
              inset 0 0 0 3px #d7a44d,
              inset 0 0 0 5px rgb(255 255 255 / 18%),
              0 9px 0 var(--navy-deep),
              0 14px 22px rgb(42 31 20 / 24%);
            transition: width 150ms ease, min-height 150ms ease, border-radius 150ms ease;
          }

          .bubble::before {
            content: "";
            position: absolute;
            inset: 10px;
            border: 2px dashed var(--stitch);
            border-radius: calc(var(--adaptive-radius) - 12px);
            pointer-events: none;
            opacity: .72;
          }

          .bubble::after {
            content: "";
            position: absolute;
            bottom: -19px;
            left: var(--tail-left, 28px);
            width: 28px;
            height: 28px;
            border-right: 8px solid var(--navy);
            border-bottom: 8px solid var(--navy);
            border-radius: 0 0 8px 0;
            background: var(--felt);
            box-shadow: 6px 6px 0 var(--navy-deep);
            transform: rotate(45deg);
            transform-origin: center;
          }

          :host([tail="center"]) .bubble { --tail-left: calc(50% - 18px); }
          :host([tail="right"]) .bubble { --tail-left: calc(100% - 58px); }
          :host([tail="none"]) .bubble::after { display: none; }

          :host([tone="blue"]) .bubble { --felt: #9ddcf0; --felt-light: #d8f5fb; --stitch: #378cac; }
          :host([tone="pink"]) .bubble { --felt: #efabc3; --felt-light: #ffdbe7; --stitch: #b65075; }
          :host([tone="green"]) .bubble { --felt: #b7dc75; --felt-light: #e3f5b5; --stitch: #659a38; }
          :host([tone="purple"]) .bubble { --felt: #bea0e5; --felt-light: #e5d6fb; --stitch: #7654ae; }

          .editor {
            position: relative;
            z-index: 2;
            box-sizing: border-box;
            width: 100%;
            min-height: 1.5em;
            padding: 0;
            border: 0;
            outline: 0;
            color: inherit;
            font-family: var(--dialog-font);
            font-size: var(--dialog-font-size, 24px);
            font-weight: 600;
            line-height: 1.5;
            letter-spacing: .03em;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            caret-color: #e56c39;
          }

          .editor:empty::before {
            content: attr(data-placeholder);
            color: rgb(80 57 31 / 45%);
            pointer-events: none;
          }

          .rivet {
            position: absolute;
            z-index: 3;
            width: 12px;
            height: 12px;
            border: 2px solid #9b641c;
            border-radius: 50%;
            background: radial-gradient(circle at 32% 28%, #fff3a2 0 12%, var(--gold) 34%, #a86617 100%);
            box-shadow: 0 1px 2px rgb(50 30 8 / 45%);
            pointer-events: none;
          }
          .tl { left: 9px; top: 9px; }
          .tr { right: 9px; top: 9px; }
          .bl { left: 9px; bottom: 9px; }
          .br { right: 9px; bottom: 9px; }

          .sizer {
            position: fixed;
            left: -10000px;
            top: -10000px;
            display: inline-block;
            box-sizing: border-box;
            width: max-content;
            max-width: var(--sizer-max, 500px);
            padding: 0;
            font-family: var(--dialog-font);
            font-size: var(--dialog-font-size, 24px);
            font-weight: 600;
            line-height: 1.5;
            letter-spacing: .03em;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            visibility: hidden;
            pointer-events: none;
          }
        </style>
        <div class="bubble" part="bubble">
          <span class="rivet tl"></span><span class="rivet tr"></span>
          <span class="rivet bl"></span><span class="rivet br"></span>
          <div class="editor" part="editor" contenteditable="true" role="textbox" aria-multiline="true"></div>
        </div>
        <span class="sizer" aria-hidden="true"></span>
      `;
      this.editor = this.shadowRoot.querySelector(".editor");
      this.bubble = this.shadowRoot.querySelector(".bubble");
      this.sizer = this.shadowRoot.querySelector(".sizer");
      this.resizeObserver = new ResizeObserver(() => this.updateRadius());
    }

    connectedCallback() {
      this.editor.dataset.placeholder = this.getAttribute("placeholder") || "请输入内容";
      this.editor.addEventListener("input", () => {
        this.resizeToContent();
        this.dispatchEvent(new CustomEvent("plush-input", {
          bubbles: true,
          detail: { value: this.value }
        }));
      });
      this.editor.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      });
      this.resizeObserver.observe(this.bubble);
      this.syncAttributes();
      requestAnimationFrame(() => this.resizeToContent());
    }

    disconnectedCallback() {
      this.resizeObserver.disconnect();
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.syncAttributes();
        requestAnimationFrame(() => this.resizeToContent());
      }
    }

    syncAttributes() {
      this.editor.dataset.placeholder = this.getAttribute("placeholder") || "请输入内容";
      this.style.setProperty("--dialog-font-size", this.getAttribute("font-size") || "24px");
    }

    resizeToContent() {
      const minimum = Math.max(112, Number.parseFloat(this.getAttribute("min-width")) || 168);
      const maximum = Math.max(minimum, Number.parseFloat(this.getAttribute("max-width")) || 560);
      const sample = this.value || this.editor.dataset.placeholder || "输入";
      const horizontalChrome = 76;

      this.sizer.style.setProperty("--sizer-max", `${maximum - horizontalChrome}px`);
      this.sizer.textContent = sample.endsWith("\n") ? `${sample}\u200b` : sample;
      const measured = this.sizer.getBoundingClientRect();
      const targetWidth = Math.min(maximum, Math.max(minimum, Math.ceil(measured.width + horizontalChrome)));
      this.bubble.style.width = `${targetWidth}px`;

      this.editor.style.height = "auto";
      this.editor.style.height = `${Math.max(36, this.editor.scrollHeight)}px`;
      this.updateRadius();
    }

    updateRadius() {
      const rect = this.bubble.getBoundingClientRect();
      const radius = Math.max(22, Math.min(38, Math.round(rect.height * 0.22)));
      this.bubble.style.setProperty("--adaptive-radius", `${radius}px`);
    }

    get value() {
      return this.editor.innerText.replace(/\n$/, "");
    }

    set value(nextValue) {
      this.editor.textContent = nextValue ?? "";
      this.resizeToContent();
    }

    clear() {
      this.value = "";
      this.editor.focus();
    }

    focus(options) {
      this.editor.focus(options);
    }
  }

  if (!customElements.get("plush-dialog")) {
    customElements.define("plush-dialog", PlushDialog);
  }
})();
