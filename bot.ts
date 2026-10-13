import { GatewayDispatchEvents } from 'discord-api-types/v10';
import { ClientQuest } from './src/client';
import { Utils } from './src/utils';

let currentUserId: string | null = null;

const tokens = (process.env.TOKEN ?? '')
	.split(/[,\n]/)
	.map((t) => t.trim().replace(/^["']|["']$/g, ''))
	.filter(Boolean);

async function start(token: string) {
	const client = new ClientQuest(token);

	/*
	client.on(
		GatewayDispatchEvents.MessageCreate,
		async ({ data: message, api }) => {
			console.log('Message received:', message.content);
			if (message.content === 'ping' && message.author.id === currentUserId) {
				await api.channels.createMessage(message.channel_id, {
					content: 'pong',
				});
			}
		},
	);
	*/

	return new Promise<void>((resolve) => {
		client.once(GatewayDispatchEvents.Ready, async ({ data, api }) => {
			currentUserId = data.user.id;
			if (process.env.GITHUB_ACTIONS === 'true') {
				console.log('Logged in!');
			} else {
				console.log(`Logged in as @${data.user.username}`);
			}

			await client.fetchQuests(false);
			const questsValid = client.questManager!.filterQuestsValidToDo();
			console.log(`Found ${questsValid.length} valid quests to do.`);
			await Promise.allSettled(
				questsValid.map((quest) => client.questManager!.doingQuest(quest)),
			);

			// ! Redeem rewards for completed quests
			// Todo: Cache quests
			/*
			await client.fetchQuests(false);
			const questsToRedeem = client.questManager!.filterQuestsValidToRedeem();
			console.log(`Found ${questsToRedeem.length} quests to redeem rewards for.`);
			for (const quest of questsToRedeem) {
				await client.questManager!.redeemQuest(quest);
			}
			*/
			// Disconnect
			console.log('All quests processed. Disconnecting...');
			await client.destroy();
			resolve();
		});

		client.connect().catch(() => resolve());
	});
}

(async () => {
	for (let i = 0; i < tokens.length; i++) {
		await start(tokens[i]);
		if (i < tokens.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
})();

process.on('unhandledRejection', (reason, promise) => {
	console.error('[Error:] Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error.message);
});
