"use client";
import ImageUploader from "./ImageUploader";

type Field = { key: string; label: string; type?: "text"|"textarea"|"checkbox"|"number"|"csv"|"lines"|"image"; full?: boolean; placeholder?: string };

type Props = {
  title: string;
  items: any[];
  onChange: (items: any[]) => void;
  fields: Field[];
  blank: Record<string, any>;
  labelKey: string;
};

export default function ArrayEditor({ title, items, onChange, fields, blank, labelKey }: Props) {
  const update = (index: number, key: string, value: any) => onChange(items.map((item,i)=>i===index?{...item,[key]:value}:item));
  const move = (index:number, dir:number) => { const to=index+dir; if(to<0||to>=items.length)return; const next=[...items]; [next[index],next[to]]=[next[to],next[index]]; onChange(next.map((v,i)=>({...v,order:i}))); };
  const remove = (index:number) => { if(confirm("Delete this item?")) onChange(items.filter((_,i)=>i!==index).map((v,i)=>({...v,order:i}))); };
  const add = () => onChange([...items, { ...blank, id: crypto.randomUUID(), visible: true, order: items.length }]);

  return <div>
    {items.map((item,index)=><div className="item-card" key={item.id || index}>
      <div className="item-head"><strong>{item[labelKey] || `${title} ${index+1}`}</strong><div className="item-actions"><button onClick={()=>move(index,-1)}>↑</button><button onClick={()=>move(index,1)}>↓</button><button onClick={()=>update(index,"visible",item.visible===false)}> {item.visible===false?"Show":"Hide"}</button><button className="danger" onClick={()=>remove(index)}>Delete</button></div></div>
      <div className="item-body"><div className="field-grid">
        {fields.map(field => {
          const value=item[field.key];
          if(field.type==="checkbox") return <div className={`field ${field.full?"full":""}`} key={field.key}><label className="checkbox-field"><input type="checkbox" checked={Boolean(value)} onChange={e=>update(index,field.key,e.target.checked)}/>{field.label}</label></div>;
          if(field.type==="textarea") return <div className={`field ${field.full?"full":""}`} key={field.key}><label>{field.label}</label><textarea value={value||""} onChange={e=>update(index,field.key,e.target.value)} placeholder={field.placeholder}/></div>;
          if(field.type==="csv") return <div className={`field ${field.full?"full":""}`} key={field.key}><label>{field.label}</label><input value={(value||[]).join(", ")} onChange={e=>update(index,field.key,e.target.value.split(",").map((v:string)=>v.trim()).filter(Boolean))} placeholder={field.placeholder||"Comma separated"}/></div>;
          if(field.type==="lines") return <div className={`field ${field.full?"full":""}`} key={field.key}><label>{field.label}</label><textarea value={(value||[]).join("\n")} onChange={e=>update(index,field.key,e.target.value.split("\n").map((v:string)=>v.trim()).filter(Boolean))} placeholder={field.placeholder||"One item per line"}/></div>;
          if(field.type==="image") return <div className={`field ${field.full?"full":""}`} key={field.key}><label>{field.label}</label><ImageUploader value={value||""} onChange={v=>update(index,field.key,v)}/></div>;
          return <div className={`field ${field.full?"full":""}`} key={field.key}><label>{field.label}</label><input type={field.type==="number"?"number":"text"} value={value??""} onChange={e=>update(index,field.key,field.type==="number"?Number(e.target.value):e.target.value)} placeholder={field.placeholder}/></div>;
        })}
      </div></div>
    </div>)}
    <button className="add-button" onClick={add}>+ Add {title}</button>
  </div>;
}
