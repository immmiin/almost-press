import './styles/base.css';
import { installPaperTextures } from './design/paper';
import { route, startRouter } from './core/router';

installPaperTextures();
route('system', async () => (await import('./screens/system')).default);
route('gate', async () => (await import('./screens/system')).default);
startRouter();
