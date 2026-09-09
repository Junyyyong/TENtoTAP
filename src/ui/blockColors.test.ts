import { expect, it } from 'vitest';
import { BlockColors } from './blockColors';
import { mulberry32 } from '../core/rng';
import type { Board } from '../core/types';
const boardOf=(width:number):Board=>({width,cells:Array.from({length:width*width},()=>({value:1,cleared:false}))});
it('uses distinct colors for 2×2 and 3×3, independent of digits',()=>{
 for(const width of [2,3])for(let seed=0;seed<100;seed++){
  const board=boardOf(width), palette=new BlockColors(mulberry32(seed));
  palette.reset(board);
  expect(new Set(board.cells.map((_,i)=>palette.at(i))).size).toBe(width*width);
 }
});
it('avoids matching neighbors on every board size',()=>{
 for(let width=2;width<=9;width++)for(let seed=0;seed<100;seed++){
  const board=boardOf(width),palette=new BlockColors(mulberry32(seed));palette.reset(board);
  board.cells.forEach((_,i)=>{
   if(i%width)expect(palette.at(i)).not.toBe(palette.at(i-1));
   if(i>=width)expect(palette.at(i)).not.toBe(palette.at(i-width));
  });
 }
});
it('preserves existing colors and balances newly filled slots',()=>{
 const board=boardOf(3),palette=new BlockColors(mulberry32(1));palette.reset(board);
 const colors=board.cells.map((_,i)=>palette.at(i));
 const clone={...board,cells:board.cells.map(c=>({...c}))};palette.sync(board,clone);
 expect(board.cells.map((_,i)=>palette.at(i))).toEqual(colors);
 const cleared={...board,cells:board.cells.map((c,i)=>({...c,cleared:i===0}))};
 palette.sync(board,cleared);palette.sync(cleared,board);
 expect(board.cells.map((_,i)=>palette.at(i))).toEqual(colors);
});
