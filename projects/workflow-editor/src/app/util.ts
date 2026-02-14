import {PostMessageMessage} from '@geoengine/common';

export const gisOrigin = (): string => `http://${window.location.hostname}:4200`;

export const postMessageToGis = (message: PostMessageMessage): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    window.opener.postMessage(message, gisOrigin());
};
