import {id as module_id} from '../../../../module.json';

export class LocationUIManager {
    constructor(sheet) {
        this.sheet = sheet;
    }

    get document() {
        return this.sheet.document;
    }

    onFirstRender(element) {
        const header = element.querySelector('.window-header');
        if (!header) {
            return;
        }

        this.addModeToggle(header);
        this.addHeaderElements(element);
    }

    onRender(element) {
        this.repositionTabs(element);
        this.updateFormTabClass('inventory');
    }

    addModeToggle(header) {
        if (!this.document.isOwner) {
            return;
        }

        const existing = header.querySelector('.mode-slider');
        if (existing) {
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

    async addHeaderElements(element) {
        const existing = element.querySelector('.header-elements');
        if (existing) {
            return;
        }

        const html = await foundry.applications.handlebars.renderTemplate(
            `modules/${module_id}/templates/features/location/header-elements.hbs`,
            {}
        );

        const elements = document.createElement('div');
        elements.classList.add('header-elements');
        elements.innerHTML = html;

        element.querySelector('.window-title')?.insertAdjacentElement('afterend', elements);
    }

    repositionTabs(element) {
        const nav = element.querySelector('.tabs');
        const windowHeader = element.querySelector('.window-header');
        if (nav && windowHeader && nav.parentElement !== element) {
            nav.remove();
            element.insertBefore(nav, windowHeader);
        }
    }

    async onChangeSheetMode(event) {
        const {MODES} = this.sheet.constructor;
        const toggle = event.currentTarget;
        this.sheet._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
        this.sheet.render({force: true});
    }

    updateFormTabClass(active) {
        const content = this.sheet.element?.querySelector('.window-content');
        if (!content) {
            return;
        }
        content.className = content.className.replace(/\btab-\w+/g, '');
        content.classList.add(`tab-${active}`);
    }
}
