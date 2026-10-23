// Ported verbatim from references/dream-object-index.html (category: nature). Do not redraw.
/* eslint-disable */
import { s, t, k, C, E, R, D, DE, G, L, LB, RING, RINGE, SH, star, range, WAVE, type ObjDef } from '../riso/parts';
void s; void t; void k; void C; void E; void R; void D; void DE; void G; void L; void LB; void RING; void RINGE; void SH; void star; void range; void WAVE;
export const nature: Record<string, ObjDef> = {
tree:{c:'nature',en:'Tree',ko:'나무',al:['나무','숲','tree','forest','woods'],d:()=>[
  SH(100,42),
  s(1,R(94,110,12,46,3)),s(2,C(100,82,44)),
  t(1,D('M100 38 A44 44 0 0 1 100 126Z')),k(E(84,64,10,5,-35)),
  s(0,R(72,144,56,8,2)),s(0,G('76,150 124,150 116,176 84,176'))]},
tulip:{c:'nature',en:'Flower',ko:'꽃',al:['꽃','튤립','장미','정원','flower','tulip','rose','garden'],d:()=>[
  s(1,L('M100 176 C100 142 98 122 100 98',6)),
  s(1,D('M100 162 C80 152 64 130 68 112 C86 120 98 140 100 162Z')),
  s(1,D('M100 150 C120 140 134 120 130 102 C112 112 102 130 100 150Z')),
  s(0,D('M70 58 C70 90 84 106 100 106 C116 106 130 90 130 58 L115 74 L100 50 L85 74Z')),
  s(2,D('M85 74 L100 50 L115 74 C113 92 106 101 100 106 C94 101 87 92 85 74Z')),
  t(0,C(148,52,4)),t(0,C(58,40,3)),t(0,C(140,30,2.5))]},
cactus:{c:'nature',en:'Cactus',ko:'선인장',al:['선인장','사막','cactus','desert'],d:()=>[
  SH(100,40),
  s(1,R(86,46,28,96,14)),
  s(1,D('M60 76 A9 9 0 0 1 78 76 V100 H88 V118 H72 A12 12 0 0 1 60 106Z')),
  s(1,D('M140 60 A9 9 0 0 0 122 60 V90 H112 V106 H128 A12 12 0 0 0 140 94Z')),
  ...[[94,70],[106,88],[94,106],[106,124],[66,88]].map(([x,y])=>k(R(x,y,2,7,1))),
  s(0,G(star(100,44,13,5,5))),s(2,C(100,44,4)),
  s(0,R(64,132,72,12,3)),s(0,G('70,144 130,144 122,176 78,176'))]},
mushroom:{c:'nature',en:'Mushroom',ko:'버섯',al:['버섯','mushroom','fungi'],d:()=>[
  SH(110,52),
  t(2,R(82,110,36,66,14)),
  s(0,D('M30 116 C30 60 70 40 100 40 C130 40 170 60 170 116Z')),
  k(C(70,84,10)),k(C(112,62,12)),k(C(140,96,9)),k(C(96,100,7)),
  s(1,R(40,112,120,8,4)),
  t(2,R(154,150,12,26,6)),s(1,D('M140 152 C140 134 150 128 160 128 C170 128 180 134 180 152Z'))]},
wave:{c:'nature',en:'Wave',ko:'파도',al:['파도','바다','해변','wave','sea','ocean','beach'],d:()=>[
  s(0,C(150,66,22)),
  t(1,`<path d="${WAVE(116)} V176 H0Z" fill="{F}"/>`),
  s(1,`<path d="${WAVE(138)} V176 H0Z" fill="{F}"/>`),
  s(2,LB(WAVE(138),5)),
  k(LB(WAVE(158,10),4))]},
mountain:{c:'nature',en:'Mountain',ko:'산',al:['산','언덕','mountain','hill','hills'],d:()=>[
  s(0,C(156,56,18)),
  s(1,G('8,176 76,58 146,176')),t(1,G('86,176 146,92 198,176')),
  k(G('76,58 60,86 70,82 78,92 86,82 94,88'))]},
shell:{c:'nature',en:'Seashell',ko:'조개',al:['조개','소라','shell','seashell','clam'],d:()=>{
  const p=(a:number)=>{const r=a*Math.PI/180;return [(100+88*Math.cos(r)).toFixed(1),(166+88*Math.sin(r)).toFixed(1)];};
  const [ax,ay]=p(195),[bx,by]=p(345);
  return [SH(100,60),t(1,D(`M108 172 L${+ax+8} ${+ay+6} A88 88 0 0 1 ${+bx+8} ${+by+6}Z`)),
  s(0,D(`M100 166 L${ax} ${ay} A88 88 0 0 1 ${bx} ${by}Z`)),
  ...[215,235,255,270,285,305,325].map(a=>{const [x,y]=p(a);return k(L(`M100 166 L${x} ${y}`,3));}),
  s(2,R(82,156,36,18,5))];}},
palm:{c:'nature',en:'Palm Tree',ko:'야자수',al:['야자수','섬','palm','island','tropical'],d:()=>[
  SH(100,46),
  s(1,D('M92 176 C88 140 96 100 110 62 L118 64 C106 102 100 140 104 176Z')),
  ...[15,50,130,165,-15,195].map(a=>s(0,`<ellipse cx="148" cy="62" rx="34" ry="9" transform="rotate(${a} 114 62)" fill="{F}"/>`)),
  s(2,C(108,74,7)),s(2,C(121,76,7))]},

};
