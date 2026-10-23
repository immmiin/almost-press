// Ported verbatim from references/dream-object-index.html (category: body). Do not redraw.
/* eslint-disable */
import { s, t, k, C, E, R, D, DE, G, L, LB, RING, RINGE, SH, star, range, WAVE, type ObjDef } from '../riso/parts';
void s; void t; void k; void C; void E; void R; void D; void DE; void G; void L; void LB; void RING; void RINGE; void SH; void star; void range; void WAVE;
export const body: Record<string, ObjDef> = {
eye:{c:'body',en:'Eye',ko:'눈',al:['눈','눈동자','시선','eye','eyes','look','watch'],float:true,d:()=>{
  const lashes=[40,58,76,94,112,130,148,164].map(x=>{const tt=(x-24)/152,y=100-132*tt*(1-tt);return s(1,L(`M${x} ${y.toFixed(1)} L${(x+(x-100)*.22).toFixed(1)} ${(y-15).toFixed(1)}`,3.4));});
  return [...lashes,s(2,D('M24 100 Q100 34 176 100 Q100 166 24 100Z')),s(1,C(100,100,32)),s(0,C(100,100,14)),k(C(111,89,6)),
  t(1,D('M150 128 C150 140 160 146 160 153 C160 160 140 160 140 153 C140 146 150 140 150 128Z'))];}},
hand:{c:'body',en:'Hand',ko:'손',al:['손','손가락','hand','hands','finger','fingers'],d:()=>[
  s(0,R(64,52,18,64,9)),s(0,R(86,38,18,76,9)),s(0,R(108,44,18,70,9)),s(0,R(130,62,16,56,8)),
  s(0,R(36,102,16,48,8,-42)),s(0,R(62,96,86,66,26)),
  s(2,E(104,124,15,9)),s(1,C(104,124,5)),
  s(1,R(70,156,70,22,3)),k(R(70,163,70,3))]},
lips:{c:'body',en:'Lips',ko:'입술',al:['입술','입','키스','lips','mouth','kiss'],float:true,d:()=>[
  t(1,D('M34 108 C60 78 86 84 110 96 C134 84 160 78 186 108 C160 148 60 148 34 108Z')),
  s(0,D('M24 100 C50 70 76 76 100 88 C124 76 150 70 176 100 C150 140 50 140 24 100Z')),
  k(L('M32 100 C60 106 140 106 168 100',4)),k(E(80,86,9,3,-10))]},
tooth:{c:'body',en:'Tooth',ko:'이빨',al:['이빨','치아','teeth','tooth','dentist','치과'],d:()=>{
  const p='M48 60 C48 36 72 32 84 40 C92 46 108 46 116 40 C128 32 152 36 152 60 C152 90 140 104 136 130 C132 160 120 176 112 156 C106 140 94 140 88 156 C80 176 68 160 64 130 C60 104 48 90 48 60Z';
  return [SH(100,40),t(1,D(p)),s(1,L(p,5)),t(0,C(78,90,9)),t(0,C(122,90,9)),
  s(1,L('M88 100 Q100 112 112 100',3.5)),s(1,C(86,78,3.5)),s(1,C(114,78,3.5)),s(2,G(star(164,40,13,3,4)))];}},

};
