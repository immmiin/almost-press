import './styles/base.css';
import { installPaperTextures } from './design/paper';
import { route, startRouter } from './core/router';
import { atmosphere } from './atmosphere/atmosphere';

installPaperTextures();
atmosphere().setPage(1);
(window as unknown as { __atmo: unknown }).__atmo = atmosphere();
route('system', async () => (await import('./screens/system')).default);
route('specimen', async () => (await import('./screens/specimen')).default);
route('press', async () => (await import('./press/press')).default);
route('reader', async () => (await import('./screens/reader')).default);
route('export', async () => (await import('./screens/export')).default);
route('colophon', async () => (await import('./screens/colophon')).default);
route('gate', async () => (await import('./screens/gate')).default);
startRouter();
