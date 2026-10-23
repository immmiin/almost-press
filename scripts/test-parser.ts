import { parse } from '../src/parse/parser';
for (const s of ['I was late for a swim, but the pool was in my grandmother\'s kitchen and the clock kept getting bigger.',
  '수영장에 늦었는데 할머니의 부엌에 백조가 있었고 시계가 점점 커졌다',
  '台所に白鳥がいて、時計はどんどん大きくなった。おばあちゃんの階段で泳ぐ夢',
  'a swan in the 台所 and 백조 on the stairs']) console.log(JSON.stringify(parse(s)));
