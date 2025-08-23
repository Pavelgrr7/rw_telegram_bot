// src/scenes/context.interfaces.ts

import { Context, Scenes } from 'telegraf';

export interface ApplicationData {
    user?: string;
    projectType?: string;
    area?: number;
    location?: string;
    budget?: number;
    info?: string;
    name?: string;
    phone?: string;
}

export interface ApplicationWizardSession extends Scenes.WizardSessionData {
    applicationState: ApplicationData;
    isEditing?: boolean;
    history: number[];
    toDeleteMsgId?: number;
    lastCompletedStep?: number;
    // lastUserMessageId?: number;

}

export interface RwBotContext extends Scenes.WizardContext<ApplicationWizardSession> {
}