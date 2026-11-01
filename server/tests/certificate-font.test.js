import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
import {generateCertificatePdf} from '../src/certificateGenerator.js';

test('Compact Lora PDFs retain readable names and both template pages',async()=>{
 const template=await PDFDocument.create();template.addPage();template.addPage();
 const name="NUR AIN BINTI DATO' MUHAMMAD ABDULLAH";
 const generated=await generateCertificatePdf({templateBytes:await template.save(),studentName:name});
 assert.ok(generated.bytes.length<15000,'Only name glyphs should be embedded; avoid a full font per student.');
 const pdf=await pdfjs.getDocument({data:new Uint8Array(generated.bytes),disableFontFace:true}).promise;
 try {
  assert.equal(pdf.numPages,2);
  const text=await (await pdf.getPage(1)).getTextContent();
  assert.equal(text.items.map(item=>item.str).join(' ').replace(/\s+/g,' ').trim(),name);
 } finally {await pdf.destroy();}
});
