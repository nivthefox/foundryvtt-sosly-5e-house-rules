export class LocationUIManager {
    constructor(sheet) {
        this.sheet = sheet;
    }

    get document() {
        return this.sheet.document;
    }

    async renderOuter() {
        const html = await ActorSheet.prototype._renderOuter.call(this.sheet);
        const htmlElement = html[0] || html;
        const header = htmlElement.querySelector('.window-header');

        if (!header) {
            return html;
        }

        this.addModeToggle(header);
        this.addHeaderElements(htmlElement);
        this.addWarningsButton(header);
        this.setupHeaderButtons(header);

        return html;
    }

    addModeToggle(header) {
        if (!this.document.isOwner) {
            return;
        }

        const toggle = document.createElement('slide-toggle');
        toggle.checked = this.sheet._mode === this.sheet.constructor.MODES.EDIT;
        toggle.classList.add('mode-slider');
        toggle.dataset.tooltip = 'DND5E.SheetModeEdit';
        toggle.setAttribute('aria-label', game.i18n.localize('DND5E.SheetModeEdit'));
        toggle.addEventListener('change', this.onChangeSheetMode.bind(this));
        toggle.addEventListener('dblclick', event => event.stopPropagation());
        header.insertAdjacentElement('afterbegin', toggle);
    }

    addHeaderElements(htmlElement) {
        const elements = document.createElement('div');
        elements.classList.add('header-elements');
        elements.innerHTML = `
            <div class="source-book">
                <a class="config-button" data-action="source" data-tooltip="DND5E.SOURCE.Action.Configure"
                   aria-label="${game.i18n.localize('DND5E.SOURCE.Action.Configure')}" hidden="">
                    <i class="fas fa-cog"></i>
                </a>
                <span></span>
            </div>
        `;
        htmlElement.querySelector('.window-title')?.insertAdjacentElement('afterend', elements);
    }

    addWarningsButton(header) {
        const warningsBtn = document.createElement('a');
        warningsBtn.classList.add('pseudo-header-button', 'preparation-warnings');
        warningsBtn.dataset.tooltip = 'Warnings';
        warningsBtn.setAttribute('aria-label', 'Warnings');
        warningsBtn.setAttribute('hidden', '');
        warningsBtn.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
        const firstButton = header.querySelector('.header-button');
        firstButton?.insertAdjacentElement('beforebegin', warningsBtn);
    }

    setupHeaderButtons(header) {
        const idLink = header.querySelector('.document-id-link');
        const firstButton = header.querySelector('.header-button');

        if (idLink && firstButton) {
            firstButton.insertAdjacentElement('beforebegin', idLink);
            idLink.classList.add('pseudo-header-button');
            idLink.dataset.tooltipDirection = 'DOWN';
        }

        header.querySelectorAll('.header-button').forEach(btn => {
            const label = btn.querySelector(':scope > i').nextSibling;
            if (label && label.textContent.trim()) {
                btn.dataset.tooltip = label.textContent.trim();
                btn.setAttribute('aria-label', label.textContent.trim());
                btn.addEventListener('dblclick', event => event.stopPropagation());
                label.remove();
            }
        });
    }

    async render(force, options) {
        await ActorSheet.prototype._render.call(this.sheet, force, options);
        this.repositionTabs();
    }

    repositionTabs() {
        const nav = this.sheet.element[0].querySelector('.tabs');
        const windowHeader = this.sheet.element[0].querySelector('.window-header');
        if (nav && windowHeader) {
            nav.remove();
            this.sheet.element[0].insertBefore(nav, windowHeader);
        }
    }

    async onChangeSheetMode(event) {
        const { MODES } = this.sheet.constructor;
        const toggle = event.currentTarget;
        this.sheet._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
        await this.sheet.submit();
        this.sheet.render();
    }

    onChangeTab(event, tabs, active) {
        ActorSheet.prototype._onChangeTab.call(this.sheet, event, tabs, active);
        this.updateFormTabClass(active);
    }

    updateFormTabClass(active) {
        const form = this.sheet.form;
        if (form) {
            form.className = form.className.replace(/\btab-\w+/g, '');
            form.classList.add(`tab-${active}`);
        }
    }
}
