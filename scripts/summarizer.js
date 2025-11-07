const STOPWORDS = new Set(
  "a,about,above,after,again,against,all,am,an,and,any,are,as,at,be,because,been,before,being,below,between,both,but,by,could,did,do,does,doing,down,during,each,few,for,from,further,had,has,have,having,he,her,here,hers,herself,him,himself,his,how,i,if,in,into,is,it,its,itself,just,me,more,most,my,myself,no,nor,not,now,of,off,on,once,only,or,other,our,ours,ourselves,out,over,own,same,she,should,so,some,such,than,that,the,their,theirs,them,themselves,then,there,these,they,this,those,through,to,too,under,until,up,very,was,we,were,what,when,where,which,while,who,whom,why,with,you,your,yours,yourself,yourselves"
    .split(",")
);

export function summarize(text, maxPoints = 3) {
  if (!text) return [];
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) return [];

  if (sentences.length <= maxPoints) {
    return sentences;
  }

  const scores = sentences.map((sentence, index) => {
    const tokens = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((token) => token && !STOPWORDS.has(token));

    const counts = tokens.reduce((acc, token) => {
      acc[token] = (acc[token] || 0) + 1;
      return acc;
    }, {});

    const score =
      tokens.length === 0
        ? 0
        : Object.values(counts).reduce((sum, val) => sum + val, 0) /
          tokens.length;

    return { sentence, score, index };
  });

  return scores
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxPoints)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}
