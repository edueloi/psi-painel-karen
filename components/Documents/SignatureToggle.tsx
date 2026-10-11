import React, { useEffect, useState } from 'react';
import { PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, Button, Switch } from '../UI';
import { loadSignature, type SignatureInfo } from './signatureStore';

/** Preferência do perfil como padrão do interruptor "Incluir minha assinatura" de cada documento. */
export function useSignaturePreference() {
  const [info, setInfo] = useState<SignatureInfo | null>(null);
  const [include, setInclude] = useState(false);
  useEffect(() => {
    let alive = true;
    loadSignature().then(i => { if (!alive) return; setInfo(i); setInclude(i.auto && !!i.image); });
    return () => { alive = false; };
  }, []);
  return { info, include: include && !!info?.image, setInclude };
}

interface Props { info: SignatureInfo | null; include: boolean; onChange: (v: boolean) => void }

/** Interruptor da assinatura no documento; sem assinatura cadastrada mostra o atalho "Criar minha assinatura". */
export const SignatureToggle: React.FC<Props> = ({ info, include, onChange }) => {
  if (!info) return null;
  if (!info.image) {
    return (
      <Alert variant="info" action={<Link to="/perfil?tab=assinatura"><Button variant="outline" size="xs" iconLeft={<PenLine size={14} />}>Criar minha assinatura</Button></Link>}>
        Você ainda não criou sua assinatura digital. Crie em Perfil, aba Assinatura.
      </Alert>
    );
  }
  return (
    <Switch
      checked={include}
      onCheckedChange={onChange}
      label="Incluir minha assinatura"
      description="Assinatura eletrônica simples (imagem) acima da linha de assinatura, com nome e registro profissional."
    />
  );
};
