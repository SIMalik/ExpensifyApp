import type {NavigationAction, NavigationState} from '@react-navigation/native';
import type {Writable} from 'type-fest';
import type {State} from '@navigation/types';
import type {ActionPayload} from './types';

/**
 * Motivation for this function is described in NAVIGATION.md
 *
 * @param action action generated by getActionFromState
 * @param state The root state
 * @returns minimalAction minimal action is the action that we should dispatch
 */
function getMinimalAction(action: NavigationAction, state: NavigationState): Writable<NavigationAction> {
    let currentAction: NavigationAction = action;
    let currentState: State | undefined = state;
    let currentTargetKey: string | undefined;

    while (currentAction.payload && 'name' in currentAction.payload && currentState?.routes[currentState.index ?? -1].name === currentAction.payload.name) {
        if (!currentState?.routes[currentState.index ?? -1].state) {
            break;
        }

        currentState = currentState?.routes[currentState.index ?? -1].state;
        currentTargetKey = currentState?.key;

        const payload = currentAction.payload as ActionPayload;

        // Creating new smaller action
        currentAction = {
            type: currentAction.type,
            payload: {
                name: payload?.params?.screen,
                params: payload?.params?.params,
                path: payload?.params?.path,
            },
            target: currentTargetKey,
        };
    }
    return currentAction;
}

export default getMinimalAction;
