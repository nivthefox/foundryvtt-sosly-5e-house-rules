export function addBreather() {
    Hooks.on('renderActorSheet5eCharacter2', (app, html, data) => {
        const buttons = html.find('.sheet-header-buttons');
        const button = document.createElement('button');
        button.classList.add('breather-button');
        button.classList.add('gold-button');
        button.setAttribute('data-tooltip', 'sosly.breather');
        button.setAttribute('aria-label', game.i18n.localize('sosly.breather'));

        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-face-exhaling');

        button.appendChild(icon);
        buttons.prepend(button);
    });
}
