import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Mobile cameras often produce very large JPEG/WEBP files. Compress only large
// browser-supported image files before sending them to Supabase Storage.
if (!src.includes("from 'browser-image-compression'")) {
  src = src.replace(
    "import React, { useEffect, useMemo, useState } from 'react';",
    "import React, { useEffect, useMemo, useState } from 'react';\nimport imageCompression from 'browser-image-compression';"
  );
}

// The public registration bucket intentionally has INSERT permission, not UPDATE.
// upsert:true therefore requires a policy that the anonymous registration flow
// does not have. Use normal INSERT and recover safely if a previous attempt
// already created the object.
src = src.replace(
  'upsert:true,contentType:file.type||"application/octet-stream",cacheControl:"3600"',
  'upsert:false,contentType:file.type||"application/octet-stream",cacheControl:"3600"'
);

const marker = '        const path=folder+"/"+name+"."+ext;\n        let lastError:any=null;';
const replacement = [
  '        const path=folder+"/"+name+"."+ext;',
  '        let uploadFile=file;',
  '        if(file.size>2.5*1024*1024 && /^(image\\/(jpeg|jpg|png|webp))$/i.test(file.type)){',
  '          try{',
  '            const compressed=await imageCompression(file,{maxSizeMB:2,maxWidthOrHeight:2400,useWebWorker:true,fileType:file.type});',
  '            if(compressed && compressed.size<file.size)uploadFile=new File([compressed],file.name,{type:compressed.type||file.type,lastModified:Date.now()});',
  '          }catch(compressError){console.warn("Kompresi upload dilewati:",compressError);}',
  '        }',
  '        let lastError:any=null;'
].join('\n');
if(src.includes(marker) && !src.includes('const compressed=await imageCompression')) {
  src = src.replace(marker, replacement);
}

src = src.replace(
  'const{error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||"application/octet-stream",cacheControl:"3600"});',
  'const{error}=await supabase.storage.from(bucket).upload(path,uploadFile,{upsert:false,contentType:uploadFile.type||file.type||"application/octet-stream",cacheControl:"3600"});'
);

// If a mobile network drops the response after Storage has already committed
// the object, treat the existing object as a successful upload. This prevents
// an otherwise valid registration from being discarded on a retry.
const oldCatch = '          }catch(error){lastError=error;}\n          if(attempt<3)await sleep(700*attempt);';
const newCatch = [
  '          }catch(error){',
  '            lastError=error;',
  '            try{',
  '              const{data:existing}=await supabase.storage.from(bucket).list(folder,{search:name,limit:20});',
  '              if(existing?.some((item:any)=>item?.name===name+"."+ext))return path;',
  '            }catch(checkError){console.warn("Verifikasi upload pascagagal tidak tersedia:",checkError);}',
  '          }',
  '          if(attempt<3)await sleep(900*attempt);'
].join('\n');
if(src.includes(oldCatch) && !src.includes('Verifikasi upload pascagagal')) {
  src = src.replace(oldCatch, newCatch);
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-tournament-upload-resilience] Large mobile images compressed, upload uses INSERT-only, and committed-after-network-drop uploads are detected.');
