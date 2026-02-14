import {PostMessageMessage} from '@geoengine/common';

export function gisOrigin(): string {
    return `http://${window.location.hostname}:4200`;
}

export function postMessageToGis(message: PostMessageMessage) {
    window.opener.postMessage(message, gisOrigin());
}
