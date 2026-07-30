const fs = require('fs');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');

// Extrai chave privada + certificado X.509 a partir dos bytes binários de um .pfx/.p12 (certificado A1)
function parsePfx(pfxDer, password) {
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag];
  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag];

  if (!keyBags || keyBags.length === 0) throw new Error('Certificado .pfx sem chave privada');
  if (!certBags || certBags.length === 0) throw new Error('Certificado .pfx sem certificado X.509');

  const privateKey = keyBags[0].key;
  const certificate = certBags[0].cert;
  if (!privateKey || !certificate) throw new Error('Falha ao extrair chave/certificado do .pfx');

  return {
    privateKeyPem: forge.pki.privateKeyToPem(privateKey),
    certificatePem: forge.pki.certificateToPem(certificate),
  };
}

// Extrai chave privada + certificado X.509 de um arquivo .pfx/.p12 (certificado A1) já salvo em disco
function loadPfx(pfxPath, password) {
  const pfxDer = fs.readFileSync(pfxPath, 'binary');
  return parsePfx(pfxDer, password);
}

// Assina um elemento identificado por Id dentro do XML (enveloped-signature, C14N, RSA-SHA1).
function assinarElemento(xml, localName, id, cert) {
  const sig = new SignedXml({
    privateKey: cert.privateKeyPem,
    publicCert: cert.certificatePem,
  });

  sig.addReference({
    xpath: `//*[local-name(.)='${localName}']`,
    uri: `#${id}`,
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
  });

  sig.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';

  sig.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${localName}']`, action: 'after' },
  });

  return sig.getSignedXml();
}

// Assina a tag infDPS do XML da DPS (NFS-e)
function assinarDPS(xml, idDPS, cert) {
  return assinarElemento(xml, 'infDPS', idDPS, cert);
}

module.exports = { parsePfx, loadPfx, assinarDPS };
