const db = require('./db');
(async () => {
  try {
    const patient_id = 64;
    const tenant_id = 3;
    const user_id = 6;
    const medical_record_id = "3";
    const title = "Anamnese — Eduardo Eloi";
    const custom_message = null;
    const template_type = "full";
    const approach = "tcc";
    const allow_resume = true;
    const allow_edit_after_submit = false;
    const expires_hours = 168;
    const consent_required = true;
    const notify_channels = ["link"];
    const fields_config = undefined;

    const expiresH = Number(expires_hours);
    let expiresAt = null;
    if (expiresH && expiresH > 0) {
      expiresAt = new Date(Date.now() + expiresH * 3600000);
    }

    console.log('Trying INSERT into anamnesis_sends with exact params...');
    const [result] = await db.query(
      `INSERT INTO anamnesis_sends
        (tenant_id, patient_id, professional_id, medical_record_id, title,
         custom_message, template_type, approach, allow_resume, allow_edit_after_submit,
         notify_channels, expires_at, reminder_hours, consent_required, fields_config,
         status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', NOW())`,
      [
        Number(tenant_id), Number(patient_id), Number(user_id), medical_record_id ? Number(medical_record_id) : null, title,
        custom_message || null, template_type || 'full', approach || null,
        allow_resume !== false ? 1 : 0,
        allow_edit_after_submit === true ? 1 : 0,
        notify_channels ? JSON.stringify(notify_channels) : null,
        expiresAt, null,
        consent_required !== false ? 1 : 0,
        fields_config ? JSON.stringify(fields_config) : null
      ]
    );

    const sendId = result.insertId;
    console.log('Insert success! ID:', sendId);

    const token = 'test-token-123-abc-' + Date.now();
    const shareToken = 'test-share-token';
    const [result2] = await db.query(
      `INSERT INTO anamnesis_secure_links
        (send_id, token, patient_id, professional_id, tenant_id, share_token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sendId, token, Number(patient_id), Number(user_id), Number(tenant_id), String(shareToken), expiresAt]
    );

    console.log('Link insert success! ID:', result2.insertId);
    process.exit(0);
  } catch (e) {
    console.error('INSERT FAILED:');
    console.error(e);
    process.exit(1);
  }
})();
