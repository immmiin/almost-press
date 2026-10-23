import './styles/base.css';
import { installPaperTextures } from './design/paper';
import { route, startRouter } from './core/router';
import { atmosphere } from './atmosphere/atmosphere';

installPaperTextures();
atmosphere().setPage(1);
(window as unknown as { __atmo: unknown }).__atmo = atmosphere();
route('system', async () => (await import('./screens/system')).default);
route('gate', async () => (await import('./screens/system')).default);
startRouter();
