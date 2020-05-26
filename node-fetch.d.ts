import { CookieJar } from './';

declare function c(fetch: Function, jar?: CookieJar): Function;

export = c;
