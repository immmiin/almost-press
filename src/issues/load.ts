// Issues for the Reader and Export: the current issue from the press, or the fixed Issue 01.
import type { Issue } from '../model/types';
import { getIssue } from '../model/store';
import { refreshText } from '../print/loop';

const fixed = import.meta.glob<{ default: Issue }>('./issue-*.json');

export async function loadIssue(which: string): Promise<Issue> {
  if (which === 'current') { const is = getIssue(); is.pages.forEach((p) => refreshText(is, p)); return is; }
  const loader = fixed[`./issue-${which.padStart(2, '0')}.json`];
  if (!loader) return getIssue();
  const is = structuredClone((await loader()).default) as Issue;
  is.fixed = true;
  is.pages.forEach((p) => refreshText(is, p));
  return is;
}
