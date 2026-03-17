/**
 * Theme configurator panel — generates the HTML/CSS/JS for the interactive
 * theme configuration sidebar injected into the preview server.
 */

export interface ConfiguratorTheme {
  name: string;
  properties: Record<string, string>;
}

export interface ConfiguratorOptions {
  themes: ConfiguratorTheme[];
  currentTheme: string;
  csrfToken: string;
}

/** Core color properties mapped to human-readable labels */
const CORE_COLORS: Record<string, string> = {
  '--color-accent': 'Accent',
  '--color-text': 'Text',
  '--color-text-secondary': 'Secondary',
  '--color-text-muted': 'Muted',
  '--color-background': 'Background',
  '--color-border': 'Border',
};

/** Core font properties */
const CORE_FONTS = ['--font-sans', '--font-serif'];

/**
 * Generate the complete configurator panel HTML (div + style + script).
 * Injected before </body> in the preview server.
 */
export function generateConfiguratorPanel(options: ConfiguratorOptions): string {
  const { themes, currentTheme, csrfToken } = options;

  const themesJson = JSON.stringify(themes);
  const coreColorsJson = JSON.stringify(CORE_COLORS);
  const coreFontsJson = JSON.stringify(CORE_FONTS);

  return `
<style>
.vitae-cfg {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  box-shadow: -2px 0 12px rgba(0,0,0,0.3);
  z-index: 99999;
  overflow-y: auto;
  transition: transform 0.2s ease;
  box-sizing: border-box;
}
.vitae-cfg.collapsed {
  transform: translateX(100%);
}
.vitae-cfg-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 100000;
  background: #1e1e2e;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  transition: right 0.2s ease;
}
.vitae-cfg-toggle.panel-open {
  right: 332px;
}
.vitae-cfg-header {
  padding: 16px;
  border-bottom: 1px solid #45475a;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.vitae-cfg-section {
  padding: 12px 16px;
  border-bottom: 1px solid #313244;
}
.vitae-cfg-section h3 {
  margin: 0 0 10px 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a6adc8;
}
.vitae-cfg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.vitae-cfg-row label {
  font-size: 12px;
  color: #bac2de;
  flex-shrink: 0;
  width: 90px;
}
.vitae-cfg-row input[type="color"] {
  width: 32px;
  height: 24px;
  border: 1px solid #45475a;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}
.vitae-cfg-row input[type="text"],
.vitae-cfg-row select {
  flex: 1;
  min-width: 0;
  background: #313244;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
}
.vitae-cfg-color-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.vitae-cfg-color-group input[type="text"] {
  flex: 1;
  min-width: 0;
  background: #313244;
  color: #cdd6f4;
  border: 1px solid #45475a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}
.vitae-cfg-actions {
  padding: 16px;
  display: flex;
  gap: 8px;
}
.vitae-cfg-actions button {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.vitae-cfg-row.modified label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #89b4fa;
  margin-right: 4px;
  vertical-align: middle;
}
.vitae-cfg-btn-export {
  background: #89b4fa;
  color: #1e1e2e;
}
.vitae-cfg-btn-export:hover { background: #74c7ec; }
.vitae-cfg-btn-reset {
  background: #45475a;
  color: #cdd6f4;
}
.vitae-cfg-btn-reset:hover { background: #585b70; }
.vitae-cfg-advanced-toggle {
  cursor: pointer;
  color: #89b4fa;
  font-size: 12px;
  padding: 8px 16px;
  display: block;
  border-bottom: 1px solid #313244;
}
.vitae-cfg-advanced-toggle:hover { color: #74c7ec; }
.vitae-cfg-advanced {
  display: none;
}
.vitae-cfg-advanced.open {
  display: block;
}
.vitae-cfg-status {
  padding: 8px 16px;
  font-size: 11px;
  color: #a6adc8;
  text-align: center;
}
@media print {
  .vitae-cfg, .vitae-cfg-toggle { display: none !important; }
}
</style>

<button class="vitae-cfg-toggle panel-open" id="vitaeCfgToggle" title="Toggle theme configurator (Ctrl+Shift+T)">&#9881; Theme</button>

<div class="vitae-cfg" id="vitaeCfgPanel">
  <div class="vitae-cfg-header">&#9881; Theme Configurator</div>

  <div class="vitae-cfg-section">
    <h3>Theme</h3>
    <div class="vitae-cfg-row">
      <select id="vitaeCfgTheme" style="width:100%"></select>
    </div>
  </div>

  <div class="vitae-cfg-section" id="vitaeCfgColors">
    <h3>Colors</h3>
  </div>

  <div class="vitae-cfg-section" id="vitaeCfgFonts">
    <h3>Fonts</h3>
  </div>

  <div class="vitae-cfg-advanced-toggle" id="vitaeCfgAdvToggle">&#9654; Advanced</div>
  <div class="vitae-cfg-advanced" id="vitaeCfgAdvanced">
    <div class="vitae-cfg-section" id="vitaeCfgAdvProps">
      <h3>All CSS Properties</h3>
    </div>
  </div>

  <div class="vitae-cfg-actions">
    <button class="vitae-cfg-btn-export" id="vitaeCfgExport">Export to YAML</button>
    <button class="vitae-cfg-btn-reset" id="vitaeCfgReset">Reset</button>
  </div>

  <div class="vitae-cfg-status" id="vitaeCfgStatus"></div>
</div>

<script>
(function() {
  const THEMES = ${themesJson};
  const CORE_COLORS = ${coreColorsJson};
  const CORE_FONTS = ${coreFontsJson};
  const CSRF = ${JSON.stringify(csrfToken)};
  let currentTheme = ${JSON.stringify(currentTheme)};
  let defaults = {};
  const modified = {};

  const panel = document.getElementById('vitaeCfgPanel');
  const toggle = document.getElementById('vitaeCfgToggle');
  const status = document.getElementById('vitaeCfgStatus');

  // --- Toggle panel ---
  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    toggle.classList.toggle('panel-open');
    document.body.style.marginRight = panel.classList.contains('collapsed') ? '' : '320px';
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggle.click();
    }
  });

  // Adjust body margin for panel
  document.body.style.marginRight = '320px';
  document.body.style.transition = 'margin-right 0.2s ease';

  // --- Theme selector ---
  const themeSelect = document.getElementById('vitaeCfgTheme');
  THEMES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.name;
    opt.textContent = t.name;
    if (t.name === currentTheme) opt.selected = true;
    themeSelect.appendChild(opt);
  });

  themeSelect.addEventListener('change', () => {
    const name = themeSelect.value;
    if (Object.keys(modified).length > 0) {
      if (!confirm('Unsaved changes will be lost. Switch theme?')) {
        themeSelect.value = currentTheme;
        return;
      }
    }
    fetch('/__vitae_api/switch?theme=' + encodeURIComponent(name))
      .then(() => { /* SSE reload will handle it */ })
      .catch(err => showStatus('Switch failed: ' + err.message, true));
  });

  // --- Populate controls ---
  function init() {
    const theme = THEMES.find(t => t.name === currentTheme);
    if (!theme) return;
    defaults = { ...theme.properties };

    buildColors(theme.properties);
    buildFonts(theme.properties);
    buildAdvanced(theme.properties);
  }

  function buildColors(props) {
    const container = document.getElementById('vitaeCfgColors');
    container.innerHTML = '<h3>Colors</h3>';
    for (const [varName, label] of Object.entries(CORE_COLORS)) {
      const val = getComputedValue(varName) || props[varName] || '#000000';
      const row = document.createElement('div');
      row.className = 'vitae-cfg-row';
      row.innerHTML =
        '<label>' + label + '</label>' +
        '<div class="vitae-cfg-color-group">' +
          '<input type="color" value="' + toHex6(val) + '" data-var="' + varName + '">' +
          '<input type="text" value="' + val + '" data-var="' + varName + '">' +
        '</div>';
      container.appendChild(row);

      const colorInput = row.querySelector('input[type="color"]');
      const textInput = row.querySelector('input[type="text"]');
      colorInput.addEventListener('input', () => {
        textInput.value = colorInput.value;
        applyVar(varName, colorInput.value);
      });
      textInput.addEventListener('change', () => {
        colorInput.value = toHex6(textInput.value);
        applyVar(varName, textInput.value);
      });
    }
  }

  function buildFonts(props) {
    const container = document.getElementById('vitaeCfgFonts');
    container.innerHTML = '<h3>Fonts</h3>';
    const fontOptions = [
      'system-ui, -apple-system, sans-serif',
      'Inter, system-ui, sans-serif',
      'Roboto, system-ui, sans-serif',
      '"Helvetica Neue", Arial, sans-serif',
      'Georgia, "Times New Roman", serif',
      '"Palatino Linotype", Palatino, serif',
      '"Courier New", Courier, monospace',
    ];
    CORE_FONTS.forEach(varName => {
      if (!props[varName]) return;
      const val = getComputedValue(varName) || props[varName];
      const label = varName.replace('--font-', '').charAt(0).toUpperCase() + varName.replace('--font-', '').slice(1);
      const row = document.createElement('div');
      row.className = 'vitae-cfg-row';
      let optionsHtml = '<option value="">Theme default</option>';
      fontOptions.forEach(f => {
        const selected = val.trim().startsWith(f.split(',')[0]) ? ' selected' : '';
        optionsHtml += '<option value="' + f + '"' + selected + '>' + f.split(',')[0].replace(/"/g, '') + '</option>';
      });
      row.innerHTML = '<label>' + label + '</label><select data-var="' + varName + '">' + optionsHtml + '</select>';
      container.appendChild(row);
      row.querySelector('select').addEventListener('change', (e) => {
        if (e.target.value) applyVar(varName, e.target.value);
        else removeVar(varName);
      });
    });
  }

  function buildAdvanced(props) {
    const container = document.getElementById('vitaeCfgAdvProps');
    container.innerHTML = '<h3>All CSS Properties</h3>';
    const coreSet = new Set([...Object.keys(CORE_COLORS), ...CORE_FONTS]);
    const advancedProps = Object.entries(props).filter(([k]) => !coreSet.has(k));
    if (advancedProps.length === 0) {
      container.innerHTML += '<div style="color:#6c7086;font-size:11px">No additional properties</div>';
      return;
    }
    advancedProps.forEach(([varName, defaultVal]) => {
      const val = getComputedValue(varName) || defaultVal;
      const isColor = /^#[0-9a-fA-F]{3,8}$/.test(val.trim());
      const row = document.createElement('div');
      row.className = 'vitae-cfg-row';

      const labelHtml =
        '<label title="' + varName + '" style="width:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-family:monospace">' +
          varName.replace('--', '') +
        '</label>';

      if (isColor) {
        row.innerHTML = labelHtml +
          '<div class="vitae-cfg-color-group">' +
            '<input type="color" value="' + toHex6(val) + '" data-var="' + varName + '">' +
            '<input type="text" value="' + val + '" data-var="' + varName + '">' +
          '</div>';
        container.appendChild(row);
        const colorInput = row.querySelector('input[type="color"]');
        const textInput = row.querySelector('input[type="text"]');
        colorInput.addEventListener('input', () => {
          textInput.value = colorInput.value;
          applyVar(varName, colorInput.value);
        });
        textInput.addEventListener('change', () => {
          colorInput.value = toHex6(textInput.value);
          applyVar(varName, textInput.value);
        });
      } else {
        row.innerHTML = labelHtml +
          '<input type="text" value="' + val + '" data-var="' + varName + '">';
        container.appendChild(row);
        row.querySelector('input[type="text"]').addEventListener('change', (e) => {
          applyVar(varName, e.target.value);
        });
      }
    });
  }

  // --- Advanced toggle ---
  document.getElementById('vitaeCfgAdvToggle').addEventListener('click', () => {
    const adv = document.getElementById('vitaeCfgAdvanced');
    const tog = document.getElementById('vitaeCfgAdvToggle');
    adv.classList.toggle('open');
    tog.innerHTML = adv.classList.contains('open') ? '&#9660; Advanced' : '&#9654; Advanced';
  });

  // --- Apply / remove CSS var ---
  function applyVar(name, value) {
    document.documentElement.style.setProperty(name, value);
    modified[name] = value;
    markModified(name, true);
  }

  function removeVar(name) {
    document.documentElement.style.removeProperty(name);
    delete modified[name];
    markModified(name, false);
  }

  function markModified(varName, isModified) {
    const row = panel.querySelector('[data-var="' + varName + '"]');
    if (row) {
      const r = row.closest('.vitae-cfg-row');
      if (r) r.classList.toggle('modified', isModified);
    }
  }

  function getComputedValue(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function toHex6(color) {
    if (!color) return '#000000';
    const c = color.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    if (/^#[0-9a-fA-F]{3}$/.test(c)) return '#' + c[1]+c[1]+c[2]+c[2]+c[3]+c[3];
    return '#000000';
  }

  // --- Export ---
  document.getElementById('vitaeCfgExport').addEventListener('click', () => {
    if (Object.keys(modified).length === 0) {
      showStatus('No changes to export');
      return;
    }
    const coreColorKeys = Object.keys(CORE_COLORS);
    const coreFontKeys = CORE_FONTS;
    const colors = {};
    const fonts = {};

    for (const [k, v] of Object.entries(modified)) {
      if (coreColorKeys.includes(k)) {
        const name = k.replace('--color-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        colors[name] = v;
      } else if (coreFontKeys.includes(k)) {
        const name = k.replace('--font-', '');
        fonts[name] = v;
      }
    }

    const payload = {};
    if (Object.keys(colors).length > 0) payload.colors = colors;
    if (Object.keys(fonts).length > 0) payload.fonts = fonts;

    fetch('/__vitae_api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Vitae-Token': CSRF },
      body: JSON.stringify(payload),
    })
    .then(r => {
      if (!r.ok) throw new Error('Export failed: ' + r.status);
      return r.json();
    })
    .then(() => {
      showStatus('Exported to resume.yaml');
      Object.keys(modified).forEach(k => delete modified[k]);
    })
    .catch(err => showStatus(err.message, true));
  });

  // --- Reset ---
  document.getElementById('vitaeCfgReset').addEventListener('click', () => {
    Object.keys(modified).forEach(k => {
      document.documentElement.style.removeProperty(k);
      markModified(k, false);
    });
    Object.keys(modified).forEach(k => delete modified[k]);
    init();
    showStatus('Reset to theme defaults');
  });

  function showStatus(msg, isError) {
    status.textContent = msg;
    status.style.color = isError ? '#f38ba8' : '#a6e3a1';
    setTimeout(() => { status.textContent = ''; }, 3000);
  }

  init();
})();
</script>`;
}
