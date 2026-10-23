// Hash router: GitHub Pages never 404s. Each screen mounts into #app and returns a cleanup.
export type Screen = (root: HTMLElement, params: URLSearchParams) => (() => void) | void | Promise<(() => void) | void>;
const routes = new Map<string, () => Promise<Screen>>();
let cleanup: (() => void) | void;
let current = '';
export const route = (name: string, load: () => Promise<Screen>) => routes.set(name, load);
export const currentRoute = () => current;
export function go(name: string, params = '') { location.hash = `#/${name}${params ? '?' + params : ''}`; }

async function render() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, q = ''] = raw.split('?');
  const key = routes.has(name) ? name : 'gate';
  const load = routes.get(key);
  if (!load) return;
  const screen = await load();
  const root = document.getElementById('app')!;
  const swap = () => {
    if (cleanup) cleanup();
    root.innerHTML = '';
    root.dataset.screen = key;
    current = key;
    const res = screen(root, new URLSearchParams(q));
    if (res instanceof Promise) { cleanup = undefined; res.then((c) => { if (current === key) cleanup = c; else if (c) c(); }); }
    else cleanup = res;
  };
  const doc = document as Document & { startViewTransition?: (f: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches && root.childElementCount) doc.startViewTransition(swap);
  else swap();
}
export function startRouter() { addEventListener('hashchange', render); render(); }
