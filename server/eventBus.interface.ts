import {
    MessageType,
} from '@farcaster/hub-nodejs'

export interface EventBus {
    publish(eventName: string, data: any): void;
    subscribe(eventName: string, handler: (data: any) => void): void;
}

// Implement EventBus
export class EventBusImpl implements EventBus {
    private subscribers: Map<string, ((data: any) => void)[]>;

    constructor() {
        this.subscribers = new Map();
    }

    publish(eventName: string, data: any): void {
        const handlers = this.subscribers.get(eventName);
        if (handlers) {
            handlers.forEach((handler) => handler(data));
        }
    }

    subscribe(eventName: string, handler: (data: any) => void): void {
        const handlers = this.subscribers.get(eventName);
        if (handlers) {
            handlers.push(handler);
        } else {
            this.subscribers.set(eventName, [handler]);
        }
    }
}