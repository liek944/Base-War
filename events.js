import { state } from './gameState.js';
import { addLog, flashRound } from './ui.js';
import { spawnLootGoblin } from './entities.js';

export const EVENTS = {
    LOOT_GOBLIN: {
        id: 'loot_goblin',
        name: 'The Loot Goblin',
        description: 'A Loot Goblin has appeared! Attack it for gold.',
        onStart: () => {
            spawnLootGoblin();
        }
    },
    // Future Events planned:
    /*
    BLOOD_MOON: {
        id: 'blood_moon',
        name: 'Blood Moon',
        description: 'Double damage, half HP! Total carnage!'
    },
    GOLD_RUSH: {
        id: 'gold_rush',
        name: 'Gold Rush',
        description: 'Passive gold tripled, unit costs doubled.'
    },
    TREACHERY: {
        id: 'treachery',
        name: 'Underdog Alliance',
        description: 'The bottom 2 players form a temporary alliance!'
    }
    */
};

export function triggerRandomEvent() {
    const eventKeys = Object.keys(EVENTS);
    const key = eventKeys[Math.floor(Math.random() * eventKeys.length)];
    const event = EVENTS[key];
    
    state.currentEvent = event;
    if (event.onStart) event.onStart();
    
    flashRound(`EVENT: ${event.name}!`);
    addLog(`Event: ${event.description}`, 'event');
}
