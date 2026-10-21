import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import { portalUrl } from './config.js';

const GOLD = '#BE9858', DEEP = '#123E35', GREY = '#66746D';
function drawCenteredFit(doc, text, y, width, fontSize=31) {
 let size = fontSize;
 doc.font('Times-Bold');
 while (size > 15 && doc.widthOfString(text, { fontSize:size }) > width) size -= 1;
 doc.fontSize(size).fillColor(DEEP).text(text, 78, y, { width, align:'center', lineBreak:false });
}
export function createCertificatePdf(res, student, certificate, settings, download=true) {
 const DEEP = /^#[0-9a-fA-F]{6}$/.test(settings.tema_warna||'') ? settings.tema_warna : '#123E35';
 const rawName = (student?.nama_penuh || 'Pesilat').trim();
 const safeName = rawName.replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim() || 'Sijil';
 const filename = `${safeName}.pdf`;
 const asciiName = safeName.replace(/[^\x20-\x7E]/g, '_') || 'Sijil';
 res.type('application/pdf');
 res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${asciiName}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`);
 res.setHeader('Cache-Control', 'private, no-store');
 const doc = new PDFDocument({size:'A4', layout:'landscape', margin:0, info:{Title:safeName, Author:settings.nama_organisasi, Subject:'Sijil Rasmi Pesilat'}});
 doc.pipe(res);
 const W=841.89, H=595.28;
 doc.rect(0,0,W,H).fill('#FCFBF7');
 doc.lineWidth(3).strokeColor(DEEP).rect(19,19,W-38,H-38).stroke();
 doc.lineWidth(0.8).strokeColor(GOLD).rect(28,28,W-56,H-56).stroke();
 for(const [x,y,mx,my] of [[44,44,1,1],[W-44,44,-1,1],[44,H-44,1,-1],[W-44,H-44,-1,-1]]){
  doc.strokeColor(GOLD).lineWidth(1.4).moveTo(x,y+my*42).lineTo(x,y).lineTo(x+mx*42,y).stroke();
  doc.circle(x+mx*9,y+my*9,2.2).fill(GOLD);
 }
 doc.fillColor(GOLD).font('Times-Bold').fontSize(12).text((settings.nama_organisasi||'AKADEMI PRO SILAT').toUpperCase(),60,75,{width:W-120,align:'center',characterSpacing:2});
 doc.fillColor(GREY).font('Helvetica').fontSize(10).text(settings.sub_organisasi||'',60,97,{width:W-120,align:'center'});
 doc.moveTo(W/2-90,125).lineTo(W/2+90,125).lineWidth(1).strokeColor(GOLD).stroke();
 doc.fillColor(DEEP).font('Times-Bold').fontSize(38).text('SIJIL PENGHARGAAN',60,147,{width:W-120,align:'center'});
 doc.fillColor(GREY).font('Times-Roman').fontSize(13).text('Dengan sukacitanya dianugerahkan kepada',60,216,{width:W-120,align:'center'});
 drawCenteredFit(doc,student.nama_penuh.toUpperCase(),249,W-160,30);
 doc.moveTo(W/2-180,300).lineTo(W/2+180,300).strokeColor('#CBB58A').lineWidth(.6).stroke();
 doc.fillColor(DEEP).font('Times-Bold').fontSize(16).text(certificate.nama_sijil,60,317,{width:W-120,align:'center'});
 doc.fillColor(GREY).font('Helvetica').fontSize(11).text(`${student.peringkat}  •  ${student.cawangan}`,60,345,{width:W-120,align:'center'});
 doc.fillColor(GREY).font('Helvetica').fontSize(10).text(`Tarikh: ${new Date(certificate.tarikh_isu+'T00:00:00Z').toLocaleDateString('ms-MY',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}`,60,374,{width:W-120,align:'center'});
 doc.moveTo(100,463).lineTo(285,463).lineWidth(.6).strokeColor(GREY).stroke();
 doc.fillColor(DEEP).font('Helvetica-Bold').fontSize(10).text(settings.nama_penandatangan||'Pengarah Akademi',95,471,{width:195,align:'center'});
 doc.fillColor(GREY).font('Helvetica').fontSize(9).text(settings.jawatan_penandatangan||'Pengarah Program',95,487,{width:195,align:'center'});
 doc.circle(666,462,33).lineWidth(2).strokeColor(GOLD).stroke();
 doc.fillColor(GOLD).font('Times-Bold').fontSize(11).text('RASMI',636,457,{width:60,align:'center'});
 doc.fillColor(GREY).font('Helvetica').fontSize(7).text(`ID Sijil: ${certificate.public_token.slice(0,8).toUpperCase()} • Semak: ${portalUrl}/verify/${certificate.public_token}`,55,545,{width:W-110,align:'center'});
 doc.end();
}
export function uploadedToPdf(res, row, student, download=true) {
 const rawName = (student?.nama_penuh || 'Pesilat').trim();
 const safeName = rawName.replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim() || 'Sijil';
 const filename = `${safeName}.pdf`;
 const asciiName = safeName.replace(/[^\x20-\x7E]/g, '_') || 'Sijil';
 res.type('application/pdf');
 res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${asciiName}.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`);
 res.setHeader('Cache-Control', 'private, no-store');
 if (row.file_type === 'application/pdf') return fs.createReadStream(row.file_path).pipe(res);
 const doc = new PDFDocument({size:'A4', margin:0, autoFirstPage:false});
 doc.pipe(res);
 doc.addPage();
 const availableWidth = doc.page.width - 36, availableHeight = doc.page.height - 36;
 doc.image(row.file_path,18,18,{fit:[availableWidth,availableHeight],align:'center',valign:'center'});
 doc.end();
}
