import { CookieJar } from 'tough-cookie'

declare function fetchCookieDecorator(fetch: Function, jar?: CookieJar): any;

export = fetchCookieDecorator;
