// 生成群岛切分可视化 SVG（仅分析用，不改游戏代码）
const pages = [
  { p:1, title:"数与运算 · 整数运算基础", color:"#f79228", note:"5 岛",
    chips:[["MK-01","计数"],["MK-02","位值"],["MK-03","加法"],["MK-04","减法"],["MK-05","乘法"]] },
  { p:2, title:"数与运算 · 数的扩充", color:"#f5a623", note:"5 岛",
    chips:[["MK-06","除法"],["MK-08","小数"],["MK-09","百分数"],["MK-10","负数"],["MK-37","因数倍数"]] },
  { p:3, title:"图形与几何 · 平面图形", color:"#5bbf9b", note:"4 岛",
    chips:[["MK-15","图形认识"],["MK-16","角"],["MK-17","周长"],["MK-18","面积"]] },
  { p:4, title:"图形与几何 · 立体与变换", color:"#4aa8c0", note:"4 岛（含★）",
    chips:[["MK-19","体积"],["MK-20","图形运动"],["MK-21","位置方向"],["MK-07★","分数"]] },
  { p:5, title:"统计与概率", color:"#b08be6", note:"4 岛",
    chips:[["MK-24","分类整理"],["MK-25","统计图"],["MK-26","平均数"],["MK-27","可能性"]] },
  { p:6, title:"数的关系 + 代数初步", color:"#e08a8a", note:"4 岛",
    chips:[["MK-11","比"],["MK-12","比例"],["MK-13","字母表示数"],["MK-14","方程"]] },
  { p:7, title:"量与测量 + 数学广角", color:"#8ab6e0", note:"3 岛",
    chips:[["MK-22","单位换算"],["MK-23","时间"],["MK-28","集合"]] },
];

const CW=330, CH=166, GX=15, GY=15, GAPX=20, GAPY=18;
const cols=2;
const W = GX*2 + CW*2 + GAPX;
const rows = Math.ceil(pages.length/cols);
const H = GY*2 + CH*rows + GAPY*(rows-1);

function chip(x,y,w,txt,star){
  const fill = star? "#3a2f12" : "#2c3a4a";
  const stroke = star? "#f5a623" : "#3d4d60";
  const fg = star? "#ffd479" : "#dbe6f0";
  return `<rect x="${x}" y="${y}" width="${w}" height="24" rx="6" fill="${fill}" stroke="${stroke}"/>`+
`<text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" fill="${fg}" font-family="sans-serif">${txt}</text>`;
}

let body="";
pages.forEach((pg,i)=>{
  const col=i%cols, row=Math.floor(i/cols);
  const x=GX+col*(CW+GAPX), y=GY+row*(CH+GAPY);
  body+=`<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="14" fill="#222e3c" stroke="#36475a" stroke-width="1.5"/>`;
  body+=`<rect x="${x}" y="${y}" width="${CW}" height="34" rx="14" fill="${pg.color}"/>`;
  body+=`<rect x="${x}" y="${y+18}" width="${CW}" height="16" fill="${pg.color}"/>`;
  body+=`<circle cx="${x+22}" cy="${y+17}" r="12" fill="#1a2330"/>`;
  body+=`<text x="${x+22}" y="${y+22}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="sans-serif">${pg.p}</text>`;
  body+=`<text x="${x+42}" y="${y+22}" font-size="13.5" font-weight="700" fill="#1a2330" font-family="sans-serif">${pg.title}</text>`;
  body+=`<text x="${x+CW-10}" y="${y+22}" text-anchor="end" font-size="12" font-weight="700" fill="#1a2330" font-family="sans-serif">${pg.note}</text>`;
  const n=pg.chips.length;
  const innerX=x+16, innerY=y+48, innerW=CW-32;
  const perRow = n<=4? n : 3;
  const rowsC = Math.ceil(n/perRow);
  pg.chips.forEach((c,j)=>{
    const r=Math.floor(j/perRow), idx=j%perRow;
    const cnt = (r===rowsC-1)? (n-perRow*(rowsC-1)) : perRow;
    const w=(innerW-(cnt-1)*8)/cnt;
    const cx=innerX+idx*(w+8);
    const cy=innerY+r*30;
    body+=chip(cx,cy,w,c[0]+" "+c[1], c[0].includes("★"));
  });
});

const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="sans-serif">\n`+
`<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="#161e29"/>\n`+
`<text x="${GX}" y="${H-6}" font-size="11" fill="#7c8aa0" font-family="sans-serif">★ = 从「数与运算」调入「图形与几何」的 MK-07 分数（面积/图形模型最贴近图形）· 共 7 页 / 29 岛</text>\n`+
body+`\n</svg>\n`;
console.log(svg);
