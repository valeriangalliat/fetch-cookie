declare namespace c {
  interface CookieJar {
    getCookieString(currentUrl: string, cb: (err: any, cookies: string) => void): void;
    setCookie(cookieString: string, currentUrl: string, cb: (err: any) => void): void;
  }
}

declare function c(fetch: Function, jar?: c.CookieJar): Function;

export = c;
