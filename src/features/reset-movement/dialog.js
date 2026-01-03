export async function showApprovalDialog(data) {
    const modeLabel = data.mode === 'turnStart'
        ? game.i18n.localize('sosly.reset-movement.reset-to-start')
        : game.i18n.localize('sosly.reset-movement.step-back');

    const content = game.i18n.format('sosly.reset-movement.approval.content', {
        player: data.userName,
        token: data.tokenName,
        mode: modeLabel
    });

    const result = await foundry.applications.api.DialogV2.wait({
        window: {
            title: game.i18n.localize('sosly.reset-movement.approval.title')
        },
        content: `<p>${content}</p>`,
        buttons: [
            {
                action: 'approve',
                label: game.i18n.localize('sosly.reset-movement.approval.approve'),
                default: true,
                callback: () => true
            },
            {
                action: 'deny',
                label: game.i18n.localize('sosly.reset-movement.approval.deny'),
                callback: () => false
            }
        ],
        close: () => false
    });

    return result === true;
}
