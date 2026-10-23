// Ported verbatim from references/dream-object-index.html (category: sky). Do not redraw.
/* eslint-disable */
import { s, t, k, C, E, R, D, DE, G, L, LB, RING, RINGE, SH, star, range, WAVE, type ObjDef } from '../riso/parts';
void s; void t; void k; void C; void E; void R; void D; void DE; void G; void L; void LB; void RING; void RINGE; void SH; void star; void range; void WAVE;
export const sky: Record<string, ObjDef> = {
cloud:{c:'sky',en:'Cloud',ko:'구름',al:['구름','안개','하늘','cloud','fog','sky'],float:true,d:()=>[
  t(1,C(70,112,30)),t(1,C(106,92,40)),t(1,C(142,112,30)),t(1,R(40,112,130,32,16)),
  s(1,R(48,132,114,12,6)),t(0,C(122,82,18)),k(E(94,78,16,6,-12)),
  s(1,R(70,152,5,16,2.5,14)),s(1,R(102,158,5,16,2.5,14)),s(1,R(134,152,5,16,2.5,14))]},
storm:{c:'sky',en:'Storm',ko:'번개',al:['번개','천둥','폭풍','storm','thunder','lightning'],float:true,d:()=>[
  ...[60,84,132,150].map((x,q)=>t(0,R(x,112+q%2*8,4,16,2,14))),
  s(1,C(70,78,24)),s(1,C(104,62,34)),s(1,C(138,80,24)),s(1,R(46,78,116,26,13)),
  s(2,G('106,92 80,140 100,140 86,186 132,122 110,122 124,92'))]},
moon:{c:'sky',en:'Moon',ko:'달',al:['달','달빛','밤','moon','night'],float:true,d:()=>[
  s(2,C(100,100,56)),k(C(128,84,46)),
  t(0,C(66,112,9)),t(0,C(82,144,6)),t(0,C(60,82,5)),
  s(1,G(star(150,152,16,4,4))),s(0,G(star(168,52,9,2.5,4)))]},
sun:{c:'sky',en:'Sun',ko:'해',al:['해','태양','햇빛','아침','sun','sunlight','morning'],float:true,d:()=>[
  ...range(12).map(a=>s(0,`<rect x="96" y="18" width="8" height="${a%2?18:26}" rx="4" transform="rotate(${a*30} 100 100)" fill="{F}"/>`)),
  s(2,C(100,100,46)),t(0,C(100,100,30)),k(E(84,82,10,5,-30))]},
star:{c:'sky',en:'Star',ko:'별',al:['별','별빛','star','stars'],float:true,d:()=>[
  t(0,G(star(110,110,66,28,5))),s(2,G(star(100,100,66,28,5))),
  s(1,G(star(162,40,13,3,4))),s(1,G(star(40,160,9,2.5,4)))]},
rainbow:{c:'sky',en:'Rainbow',ko:'무지개',al:['무지개','rainbow'],float:true,d:()=>[
  s(0,LB('M26 140 A74 74 0 0 1 174 140',16)),
  s(2,LB('M42 140 A58 58 0 0 1 158 140',16)),
  s(1,LB('M58 140 A42 42 0 0 1 142 140',16)),
  t(1,R(18,158,58,6,3)),t(1,R(124,158,58,6,3)),
  k(C(34,140,15)),k(C(56,144,13)),k(R(18,140,56,16,8)),
  k(C(166,140,15)),k(C(144,144,13)),k(R(126,140,56,16,8))]},
snow:{c:'sky',en:'Snowflake',ko:'눈송이',al:['눈송이','겨울','snow','snowflake','winter','cold'],float:true,d:()=>[
  t(0,C(100,100,42)),
  ...range(6).map(a=>s(1,`<g transform="rotate(${a*60} 100 100)"><rect x="96" y="32" width="8" height="68" rx="4" fill="{F}"/><path d="M100 56 L86 44 M100 56 L114 44 M100 76 L90 68 M100 76 L110 68" stroke="{F}" stroke-width="6" stroke-linecap="round" fill="none"/></g>`)),
  s(2,C(100,100,10))]},
planet:{c:'sky',en:'Planet',ko:'행성',al:['행성','토성','우주','planet','saturn','space','universe'],float:true,d:()=>[
  s(0,C(100,100,40)),
  k(R(56,92,88,4,0,-18)),k(R(60,108,80,3,0,-18)),
  s(2,RINGE(100,100,78,20,9,-18)),
  s(1,G(star(34,40,10,2.5,4))),s(1,G(star(170,156,8,2,4))),t(1,C(160,40,6))]},

};
