.page{display:flex;flex-direction:column;min-height:100vh}
.topbar{padding:20px 32px;border-bottom:1px solid var(--border);background:var(--surface)}
.title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700}
.sub{font-size:13px;color:var(--muted2);margin-top:2px}
.content{flex:1;padding:28px 32px}
.filters{display:flex;gap:4px;margin-bottom:24px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px;width:fit-content}
.ftab{padding:8px 20px;border-radius:9px;font-size:13px;font-weight:500;color:var(--muted2);cursor:pointer;transition:all .15s}
.ftabOn{background:var(--surface2);color:var(--text);border:1px solid var(--border2)}
.loading{display:flex;align-items:center;justify-content:center;padding:60px;color:var(--muted)}
.empty{text-align:center;padding:60px 20px}
.emptyTitle{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px}
.emptySub{font-size:14px;color:var(--muted2)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .2s}
.card:hover{border-color:var(--border2);transform:translateY(-2px)}
.cardThumb{aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;position:relative}
.statusBadge{position:absolute;top:8px;right:8px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:500}
.done{background:rgba(34,197,94,.2);color:var(--green)}
.processing{background:rgba(245,158,11,.2);color:var(--amber)}
.failed{background:rgba(239,68,68,.2);color:var(--red)}
.cardInfo{padding:12px}
.cardTitle{font-size:13px;font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cardMeta{font-size:11px;color:var(--muted)}
.cardActions{display:flex;gap:6px;padding:0 12px 12px}
.actionBtn{flex:1;padding:6px;border-radius:7px;background:var(--surface2);border:1px solid var(--border);color:var(--muted2);font-size:12px;cursor:pointer;text-align:center;display:flex;align-items:center;justify-content:center;gap:4px;text-decoration:none;transition:all .15s}
.actionBtn:hover{color:var(--text);border-color:var(--border2)}
