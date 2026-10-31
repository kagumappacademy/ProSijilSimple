// Small requests finish within hosting time limits and keep confirmed progress on failure.
export async function generateCertificateBatches({ api, ids, templateName, issueDate, requestId, onProgress = () => {}, batchSize = 5 }) {
  const result = { total: ids.length, successCount: 0, failedCount: 0, failed: [], generatedTokens: [] };
  for (let offset = 0; offset < ids.length; offset += batchSize) {
    const chunk = ids.slice(offset, offset + batchSize);
    let response;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await api('/admin/templates/generate-batch', {
            method: 'POST',
            body: { pesilat_ids: chunk, nama_template: templateName, tarikh_isu: issueDate, request_id: requestId },
          });
          break;
        } catch (error) {
          if (attempt === 1 || (error.status >= 400 && error.status < 500 && error.status !== 429)) throw error;
        }
      }
    } catch (error) {
      result.failed.push(...ids.slice(offset).map(id => ({ id, reason: `Simpanan belum dapat disahkan: ${error.message}. Cuba jana semula.` })));
      result.failedCount = result.failed.length;
      error.result = result;
      throw error;
    }
    result.successCount += response.successCount;
    result.failed.push(...response.failed);
    result.generatedTokens.push(...response.generatedTokens);
    result.failedCount = result.failed.length;
    onProgress(Math.min(offset + chunk.length, ids.length));
  }
  return result;
}
