// Templates fixos de contrato de prestação de serviços, um por modalidade de atendimento.
// Merge-fields no formato {{campo}} são resolvidos em contract-send.js / public-profile.js.

const ONLINE_TEMPLATE = `
<h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOTERAPIA INDIVIDUAL</h1>

<p><strong>CLÁUSULA 1ª – DO OBJETO</strong><br/>
O presente contrato tem por objeto a prestação de serviços psicológicos na modalidade de psicoterapia individual, presencial e/ou online, realizada pela CONTRATADA {{professional_name}}, CPF {{professional_cpf}}, RG {{professional_rg}} conforme os princípios éticos e técnicos da Psicologia conforme registrada no CRP {{professional_crp}}. O serviço visa à promoção da saúde mental, autoconhecimento e bem-estar do(a) BENEFICIÁRIO(a) e CONTRATANTE {{patient_name}}, CPF {{patient_cpf}}, localizado(a) no endereço {{patient_address}}, ciente que a psicoterapia não estabelece garantia de resultados específicos, considerando que a evolução depende de fatores internos e do engajamento do(a) paciente/beneficiário deste processo terapêutico.</p>

<p><strong>CLÁUSULA 2ª – DA MODALIDADE, FREQUÊNCIA E DURAÇÃO</strong><br/>
Os atendimentos poderão ocorrer presencialmente no endereço indicado no cabeçalho ou de forma online (Google Meet), com duração média de 50 (cinquenta) minutos, com frequência semanal e fixado na agenda da profissional para toda {{session_day}} às {{session_time}} (horário de Brasília/Brasil). Há tolerância de até 10 (dez) minutos de atraso para ambas as partes, sendo mantido o término no horário previsto ou até o horário necessário conforme orientação da profissional. Podendo haver ajustes conforme disponibilidade de agenda.</p>

<p><strong>CLÁUSULA 3ª – DOS HONORÁRIOS E PAGAMENTO</strong><br/>
3.1. Primeira sessão (avaliação): R$ 120,00. Sessões avulsas: R$ 100,00. Pacote mensal (4 sessões/mês): R$ 360,00. Pacote quinzenal: R$ 200,00 (2 sessões/mês).<br/>
3.2. O pagamento dos pacotes deverá ser feito via PIX (Chave: {{pix_key}} – {{professional_name}}), até o dia 10 (dez) de cada mês. O pagamento da primeira sessão ou avulsa deverá ser pago com 48 horas de antecedência à consulta ou no ato do agendamento, quando for menos de 48 horas.<br/>
3.3. Os valores poderão ser revistos anualmente conforme atualização dos custos operacionais da clínica com comunicação prévia de 30 dias.<br/>
3.4. Em atraso, o atendimento poderá ser suspenso até regularização e, se preciso, realizado novo alinhamento de dia e horário de atendimento.<br/>
3.5. A nota fiscal referente aos serviços prestados é sempre emitida e enviada ao final de cada mês. O pagamento, no entanto, é sempre antecipado, conforme cláusulas 3.1 a 3.2.</p>

<p><strong>CLÁUSULA 4ª – DAS REMARCAÇÕES, CANCELAMENTOS E FALTAS</strong><br/>
4.1. Cancelamentos com antecedência mínima de 24 horas não gerarão cobrança, sendo possível reagendamento no mês.<br/>
4.2. Cancelamentos no mesmo dia ou faltas sem aviso prévio implicam cobrança integral.<br/>
4.3. Em caso de doença comprovada, o reagendamento será oferecido sem custo dentro do mês.<br/>
4.4. A CONTRATADA se compromete a comunicar impossibilidades com antecedência, oferecendo reagendamento sem ônus.</p>

<p><strong>CLÁUSULA 5ª – DO SIGILO E GUARDA DE PRONTUÁRIOS</strong><br/>
Todo o conteúdo das sessões é protegido por sigilo profissional, conforme o Código de Ética do Psicólogo. O sigilo poderá ser quebrado apenas em casos de risco à vida ou exigência legal. Os prontuários serão guardados por, no mínimo, 5 (cinco) anos após o término do atendimento, conforme Resolução CFP nº 01/2009.</p>

<p><strong>CLÁUSULA 6ª – DO ATENDIMENTO ONLINE (TELEPSICOLOGIA)</strong><br/>
O atendimento psicológico online seguirá as diretrizes do Conselho Federal de Psicologia, devendo o(a) CONTRATANTE garantir ambiente reservado, conexão estável e equipamentos adequados. Gravações de áudio/vídeo só serão permitidas mediante autorização expressa e mútua.</p>

<p><strong>CLÁUSULA 7ª – DA CONTINUIDADE DO CUIDADO</strong><br/>
Em caso de afastamento temporário, licença ou impedimento da CONTRATADA, será oferecida, quando possível, opção de encaminhamento a outro profissional ou suspensão temporária do contrato, preservando a continuidade do cuidado.</p>

<p><strong>CLÁUSULA 8ª – DA COMUNICAÇÃO FORA DAS SESSÕES</strong><br/>
Os contatos via WhatsApp ou e-mail têm caráter exclusivamente administrativo, como agendamentos, orientações breves e registros de tarefas. Mensagens extensas ou discussões clínicas devem ocorrer apenas durante as sessões.</p>

<p><strong>CLÁUSULA 9ª – DOS CASOS FORTUITOS E DE FORÇA MAIOR</strong><br/>
Ficam as partes alinhadas para reagendamentos dentro do mês em caso de imprevistos, tais como doenças, quedas de energia, instabilidade de internet ou emergências familiares, devendo ser reagendada a sessão sem custo adicional.</p>

<p><strong>CLÁUSULA 10ª – DA ACESSIBILIDADE E INCLUSÃO</strong><br/>
A CONTRATADA compromete-se a adotar ajustes razoáveis e linguagem acessível, garantindo atendimento inclusivo e respeitoso a todas as diversidades e necessidades específicas do(a) paciente.</p>

<p><strong>CLÁUSULA 11ª – DO CONSENTIMENTO E CIÊNCIA</strong><br/>
O(a) CONTRATANTE declara ter lido e compreendido todas as cláusulas deste contrato, reconhecendo que recebeu esclarecimentos sobre o serviço, valores, política de cancelamentos, sigilo profissional e proteção de dados.</p>

<p><strong>CLÁUSULA 12ª – DA VIGÊNCIA E RESCISÃO</strong><br/>
O presente contrato vigorará por prazo indeterminado, podendo ser rescindido por qualquer das partes, mediante aviso prévio de 7 (sete) dias, garantindo devolutiva e encerramento ético do processo.</p>

<p><strong>CLÁUSULA 13ª – DO FORO</strong><br/>
Fica eleito o foro da Comarca de Tatuí/SP para dirimir quaisquer dúvidas oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>

<p>E, por estarem de pleno acordo, firmam o presente contrato.</p>

<p>{{city}}, {{date}}.</p>
`;

const PRESENCIAL_TEMPLATE = `
<h1>CONTRATO DE PSICOTERAPIA INDIVIDUAL</h1>

<p>Pelo presente Contrato de Prestação de Serviços, que entre si fazem, de um lado, como CONTRATANTE e BENEFICIÁRIO(a) {{patient_name}}, estabelecido(a) em {{patient_address}}, inscrito(a) no CPF nº {{patient_cpf}} e, de outro lado, como CONTRATADA, {{professional_name}}, CPF nº {{professional_cpf}}, inscrita no Conselho Regional de Psicologia CRP {{professional_crp}}, têm entre si certo e ajustado o que se segue:</p>

<p><strong>1. Objeto e natureza do serviço</strong><br/>
1.1. Objeto. O objeto deste contrato é a prestação de serviços de psicoterapia individual, em modalidade presencial e/ou online (telepsicologia mediada por Tecnologias Digitais de Informação e Comunicação — TDICs), pautada no respeito à pessoa atendida, na ética profissional e em boas práticas da Psicologia.<br/>
1.2. Abrangência. O serviço compreende acolhimento, avaliação psicológica inicial, definição e execução de plano terapêutico, intervenções ao longo do processo e reavaliações periódicas.<br/>
1.3. Base técnica. A condução terapêutica observa referenciais científicos e técnicos adotados pela PSICÓLOGA, podendo integrar psicoeducação, desenvolvimento de habilidades, treinos e tarefas entre sessões, ajustados ao caso.<br/>
1.4. Limites do serviço. Não se incluem: atendimento de emergência/plantão, prescrição de medicamentos, perícias psicológicas, laudos/pareceres de cunho judicial ou relatórios para terceiros, salvo ajuste específico em cláusula própria, com prazos e honorários definidos.<br/>
1.5. Confidencialidade e registros. O processo é regido por sigilo profissional e manutenção de registros adequados, observando os limites legais e éticos.<br/>
1.6. Modalidade e público. O atendimento é individual. Em caso de menores de 18 anos, exige-se autorização de responsável legal e observância do melhor interesse da criança/adolescente.<br/>
1.7. Corresponsabilidade. Espera-se participação ativa do(a) PACIENTE/CONTRATANTE, com assiduidade, colaboração com metas e execução de tarefas entre sessões quando indicadas.<br/>
1.8. Telepsicologia (quando aplicável). Nos atendimentos online, o(a) PACIENTE/CONTRATANTE compromete-se a dispor de ambiente reservado, conexão estável e dispositivo adequado. A telepsicologia não configura canal de emergência.<br/>
1.9. Resultados e ajustes. Não há garantia de resultados específicos; a evolução depende de variáveis clínicas e do engajamento.<br/>
1.10. Encaminhamentos. Quando necessário, a PSICÓLOGA poderá indicar avaliação médica/psiquiátrica ou outros serviços especializados, mediante consentimento.<br/>
1.11. Acessibilidade e comunicação. O contrato e as orientações correlatas serão apresentados em linguagem clara e acessível, com ajustes razoáveis quando necessários.<br/>
1.12. Medidas de acompanhamento. Podem ser utilizados, com consentimento, instrumentos padronizados (inventários, escalas) para monitoramento de sintomas e progresso, com devolutivas periódicas.<br/>
1.13. Conflitos de interesse e limites relacionais. A PSICÓLOGA preserva neutralidade técnica, evitando relações duais e conflitos de interesse.<br/>
1.14. Uso de tecnologias e dados. A guarda e o uso de dados pessoais/sensíveis obedecem às regras contratuais e legais aplicáveis (LGPD).<br/>
1.15. Substituição e continuidade do cuidado. Em ausências prolongadas, a PSICÓLOGA buscará oferecer opções de cobertura ou encaminhamento, mediante autorização do(a) PACIENTE.<br/>
1.16. Intercorrências clínicas. Em situações de risco, priorizam-se acolhimento, orientação e encaminhamento imediato à rede de urgência. O serviço não substitui atendimento emergencial.<br/>
1.17. Respeito e diversidade. O atendimento respeita diversidade cultural, religiosa, étnico-racial, geracional, de orientação sexual, identidade de gênero e demais marcadores sociais.<br/>
1.18. Limitações legais e documentais. Atestados específicos, pareceres técnicos e documentos para terceiros somente serão emitidos quando compatíveis com a natureza do serviço, com prazos e honorários definidos em cláusula própria.<br/>
1.19. Pesquisa, ensino e supervisão. Situações de supervisão clínica podem ocorrer com anonimização das informações.<br/>
1.20. Aperfeiçoamento contínuo. A PSICÓLOGA compromete-se com atualização técnica e educação continuada.<br/>
1.21. Revisões desta cláusula. Atualizações que impactem a natureza do serviço serão comunicadas previamente e formalizadas por aditivo contratual, quando necessário.</p>

<p><strong>2. Modalidade, frequência, duração e local</strong><br/>
2.1. Modalidade e local. Os atendimentos poderão ocorrer presencialmente no endereço {{clinic_address}} e/ou online (telepsicologia) via Google Meet, alternando-se de comum acordo quando clinicamente apropriado.<br/>
2.2. Frequência e agendamento. As sessões ocorrerão com frequência semanal, em dia e horário fixos previamente combinados, toda {{session_day}}, às {{session_time}} (horário de Brasília).<br/>
2.3. Duração e estrutura. Cada sessão tem duração média de 50 (cinquenta) minutos, podendo excepcionalmente estender-se até 60 (sessenta) minutos, a critério técnico da PSICÓLOGA.<br/>
2.4. Pontualidade e atrasos. Há tolerância de atraso de até 10 (dez) minutos para ambas as partes. O término ocorre no horário originalmente previsto.<br/>
2.5. Remarcações e faltas. Os pedidos de remarcação devem ser feitos preferencialmente por WhatsApp, aplicando-se as regras da Cláusula 4.<br/>
2.6. Requisitos para telepsicologia. Ambiente reservado, internet estável e dispositivo adequado. Gravações não são autorizadas sem consentimento prévio e escrito de ambas as partes.<br/>
2.7. Quedas de conexão e interrupções. Interrupção breve: a sessão prossegue até o horário combinado. Falha persistente: reagendamento do saldo dentro do mês.<br/>
2.8. Acessibilidade e ajustes razoáveis. Orientações e materiais em linguagem clara, com ajustes razoáveis quando necessário.<br/>
2.9. Alterações de modalidade/local por imprevistos. A sessão presencial poderá migrar para o formato online no mesmo horário, sem custo adicional, quando clinicamente adequado.<br/>
2.10. Calendário, feriados e férias. Ausências programadas da PSICÓLOGA serão comunicadas previamente, com oferta de realocação ou reposição.<br/>
2.11. Check-in. Recomenda-se chegar 5 a 10 minutos antes no presencial e acessar o link com 5 minutos de antecedência no online.</p>

<p><strong>3. Honorários, pagamentos e reajustes</strong><br/>
3.1. Atendimento presencial (consultório): (a) Primeira sessão (avaliação/anamnese): R$ 180,00. (b) Sessão avulsa: R$ 160,00. (c) Pacote quinzenal: R$ 320,00. (d) Pacote mensal (4 sessões): R$ 600,00. (e) O valor promocional do pacote aplica-se mediante pagamento integral até o dia 10 (dez) de cada mês. (f) Para a primeira sessão e sessões avulsas, pagamento com antecedência mínima de 48 (quarenta e oito) horas. (g) O pacote é pessoal e intransferível. Quando o agendamento ocorrer com antecedência inferior a 48 horas, o pagamento é devido no ato do agendamento.<br/>
3.2. Validade do pacote. Destina-se ao mês de referência (4 sessões). Reposições seguem a Cláusula 4, preferencialmente dentro do mesmo mês. Em situações excepcionais, as sessões podem ser realocadas para o mês subsequente, mediante acordo.<br/>
3.3. Forma e prazo de pagamento. Meio aceito: PIX (Chave: {{pix_key}}, no nome de {{professional_name}}). Sessões avulsas e primeira sessão: pagamento com 48h de antecedência. Pacote mensal: pagamento integral até o dia 10 de cada mês. Será emitido recibo/nota correspondente ao final de cada mês, sendo o pagamento sempre antecipado.<br/>
3.4. Inadimplência. Em atraso, poderão incidir multa de 2% e juros de 1% a.m. Persistindo a inadimplência, os atendimentos poderão ser temporariamente suspensos até a regularização, preservada a possibilidade de negociação em caso de dificuldade financeira.<br/>
3.5. Reajustes anuais. Os reajustes acontecem todo ano em 10 de março. O reajuste será de R$ 20,00 por sessão sobre o valor atual, comunicado com antecedência mínima de 30 dias.<br/>
3.6. Reembolsos por convênio (livre escolha). A PSICÓLOGA poderá fornecer recibos/declarações; a solicitação de reembolso é de responsabilidade do(a) PACIENTE.<br/>
3.7. Remarcações, faltas sem aviso. Aplicam-se integralmente as regras da Cláusula 4.<br/>
3.8. Condições especiais. Em dificuldades financeiras temporárias, o(a) PACIENTE pode comunicar-se com antecedência para buscar alternativa viável.</p>

<p><strong>4. Política de cancelamentos, faltas e remarcações</strong><br/>
4.1. Abrangência e canais. Aplica-se aos atendimentos presenciais e online. Avisos preferencialmente por WhatsApp.<br/>
4.2. Referência de horário. Prazos contam em horas corridas, horário de Brasília (UTC-3).<br/>
4.3. Cancelamento com antecedência mínima de 24h: não há cobrança, com reagendamento no mesmo mês.<br/>
4.4. Cancelamento no dia: a sessão é cobrada pelo horário reservado; se houver disponibilidade, pode ser oferecido encaixe na mesma semana.<br/>
4.5. Falta sem aviso: cobrança integral pelo horário reservado, exceto doença comprovada, quando será oferecido reagendamento dentro do mês, sem custo.<br/>
4.6. Exceção por doença (comprovação simples): reagendamento dentro do mês, sem custo, ainda que o aviso ocorra no dia.<br/>
4.7. Cancelamento pela PSICÓLOGA: não há cobrança, com reposição dentro do mesmo mês.<br/>
4.8. Critérios de reagendamento: preferencialmente dentro do mesmo mês, conforme disponibilidade; reagendamentos múltiplos de uma mesma sessão podem ser limitados a 2 tentativas.<br/>
4.9. Pacotes mensais e validade: destinam-se ao mês de referência; sessões não realizadas fora desta política poderão ser consideradas usufruídas; casos excepcionais podem ser realocados ao mês seguinte, mediante acordo.<br/>
4.10. Primeira sessão e sessões avulsas (pré-pagamento): antecedência mínima de 48h; cancelamento com 24h de antecedência pode gerar crédito para reagendamento dentro do mês.<br/>
4.11. Conexão e instabilidade técnica (online): aplica-se o previsto em 2.7.<br/>
4.12. Registro e transparência: solicitações e confirmações de cancelamento/reagendamento serão registradas (data e horário do contato).</p>

<p><strong>5. Direitos e deveres</strong><br/>
5.1. A PSICÓLOGA tem direito a definir método e limites técnicos do atendimento, recusar ou encerrar o atendimento por incompatibilidade técnica/ética, receber pelos serviços conforme a Cláusula 3, gerir a agenda e cancelar por força maior sem cobrança.<br/>
5.2. A PSICÓLOGA tem o dever de atuar com zelo, respeito e ética; informar objetivos, riscos e limites do tratamento; manter sigilo e proteção de dados (LGPD); orientar e encaminhar em situações de risco; e oferecer acessibilidade.<br/>
5.3. Vedações: não prescrever medicamentos, não realizar perícias/laudos judiciais fora deste contrato, não manter relações extracontratuais que violem a neutralidade, não prometer resultados terapêuticos específicos.<br/>
5.4. Telepsicologia: uso de plataformas adequadas, reforçando que não é canal de emergência.<br/>
5.5. Comunicação: WhatsApp/e-mail para assuntos administrativos; demandas clínicas extensas devem ser tratadas em sessão.<br/>
5.6. Registros e ligações: o(a) PACIENTE/CONTRATANTE autoriza contatos por WhatsApp/e-mail para orientação breve e ajustes de agenda, registrados no prontuário; situações urgentes seguem encaminhamento à rede de emergência.</p>

<p>E, por estarem de pleno acordo, firmam o presente contrato.</p>

<p>{{city}}, {{date}}.</p>
`;

const CONTRACT_TEMPLATES = {
  online: {
    version: '1.0',
    title: 'Contrato de Psicoterapia Individual — Atendimento Online',
    body: ONLINE_TEMPLATE,
  },
  presencial: {
    version: '1.0',
    title: 'Contrato de Psicoterapia Individual — Atendimento Presencial',
    body: PRESENCIAL_TEMPLATE,
  },
};

// Mesmo estilo .split(key).join(value) usado em doc-generator.js — sem engine de template, sem loops/condicionais.
// Se tenantId for informado e o tenant tiver personalizado o contrato (contract_templates),
// usa o texto editado pelo profissional; senão cai no template fixo padrão.
async function renderContract(contractType, data, tenantId) {
  const fallbackTpl = CONTRACT_TEMPLATES[contractType];
  if (!fallbackTpl) throw new Error(`Tipo de contrato inválido: ${contractType}`);

  let tpl = fallbackTpl;
  if (tenantId) {
    try {
      const db = require('../db');
      const [[custom]] = await db.query(
        'SELECT title, template_body FROM contract_templates WHERE tenant_id = ? AND contract_type = ?',
        [tenantId, contractType]
      );
      if (custom) tpl = { version: 'custom', title: custom.title, body: custom.template_body };
    } catch (e) {
      console.warn('[contractTemplates] Erro ao buscar template customizado, usando padrão:', e.message);
    }
  }

  let rendered = tpl.body;
  const replacements = {
    '{{patient_name}}': data.patient_name || '',
    '{{patient_cpf}}': data.patient_cpf || '',
    '{{patient_address}}': data.patient_address || '',
    '{{professional_name}}': data.professional_name || '',
    '{{professional_cpf}}': data.professional_cpf || '',
    '{{professional_rg}}': data.professional_rg || '',
    '{{professional_crp}}': data.professional_crp || '',
    '{{pix_key}}': data.pix_key || '',
    '{{clinic_address}}': data.clinic_address || '',
    '{{session_day}}': data.session_day || '',
    '{{session_time}}': data.session_time || '',
    '{{city}}': data.city || '',
    '{{date}}': data.date || '',
  };
  Object.keys(replacements).forEach(key => {
    rendered = rendered.split(key).join(String(replacements[key]));
  });

  return { title: tpl.title, version: tpl.version, html: rendered };
}

module.exports = { CONTRACT_TEMPLATES, renderContract };
