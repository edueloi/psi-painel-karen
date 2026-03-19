/**
 * Formulários psicológicos padrão do PsiPainel
 * Inclui instrumentos validados para psicologia clínica, neuropsicologia e psicopedagogia.
 *
 * Uso: importado pelo seed_default_forms.js e por routes/tenants.js (criação automática)
 */

const LIKERT_4 = [
  { label: 'Nunca', value: 0 },
  { label: 'Vários dias', value: 1 },
  { label: 'Mais da metade dos dias', value: 2 },
  { label: 'Quase todos os dias', value: 3 },
];

const LIKERT_5 = [
  { label: 'Nunca', value: 0 },
  { label: 'Quase nunca', value: 1 },
  { label: 'Às vezes', value: 2 },
  { label: 'Com bastante frequência', value: 3 },
  { label: 'Com muita frequência', value: 4 },
];

const LIKERT_5_BURNOUT = [
  { label: 'Nunca', value: 0 },
  { label: 'Raramente', value: 1 },
  { label: 'Às vezes', value: 2 },
  { label: 'Frequentemente', value: 3 },
  { label: 'Sempre', value: 4 },
];

const SNAP_OPTIONS = [
  { label: 'Nem um pouco', value: 0 },
  { label: 'Só um pouco', value: 1 },
  { label: 'Bastante', value: 2 },
  { label: 'Demais', value: 3 },
];

const SIM_NAO = [
  { label: 'Sim', value: 1 },
  { label: 'Não', value: 0 },
];

function q(id, text, options, type = 'radio') {
  return { id, text, type, options, required: true };
}

function interp(id, minScore, maxScore, resultTitle, description, color) {
  return { id, minScore, maxScore, resultTitle, description, color };
}

// ─────────────────────────────────────────────────────────────
// 1. GAD-7 – Escala de Ansiedade Generalizada
// ─────────────────────────────────────────────────────────────
const GAD7 = {
  title: 'GAD-7 – Escala de Ansiedade Generalizada',
  description:
    'Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos seguintes problemas? ' +
    'Instrumento de rastreio validado para Transtorno de Ansiedade Generalizada.',
  questions: [
    q('q1', 'Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)', LIKERT_4),
    q('q2', 'Não ser capaz de impedir ou de controlar as preocupações', LIKERT_4),
    q('q3', 'Preocupar-se muito com diversas coisas', LIKERT_4),
    q('q4', 'Dificuldade para relaxar', LIKERT_4),
    q('q5', 'Ficar tão agitado(a) que se torna difícil permanecer sentado(a) quieto(a)', LIKERT_4),
    q('q6', 'Ficar facilmente aborrecido(a) ou irritado(a)', LIKERT_4),
    q('q7', 'Sentir medo como se algo terrível fosse acontecer', LIKERT_4),
  ],
  interpretations: [
    interp('i1', 0, 4, 'Ansiedade Mínima', 'Sintomas de ansiedade mínimos ou ausentes. Resultado dentro da normalidade.', '#22c55e'),
    interp('i2', 5, 9, 'Ansiedade Leve', 'Sintomas leves de ansiedade. Monitoramento e acompanhamento recomendados.', '#eab308'),
    interp('i3', 10, 14, 'Ansiedade Moderada', 'Sintomas moderados. Avaliação clínica aprofundada e suporte terapêutico indicados.', '#f97316'),
    interp('i4', 15, 21, 'Ansiedade Grave', 'Sintomas graves de ansiedade. Intervenção clínica urgente e avaliação psiquiátrica recomendadas.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 2. PSS-10 – Escala de Estresse Percebido
// ─────────────────────────────────────────────────────────────
const PSS10 = {
  title: 'PSS-10 – Escala de Estresse Percebido',
  description:
    'As questões nesta escala perguntam sobre seus sentimentos e pensamentos durante o último mês. ' +
    'Responda com que frequência você sentiu ou pensou de determinada maneira.',
  questions: [
    q('q1', 'Com que frequência você ficou preocupado(a) por causa de algo que aconteceu inesperadamente?', LIKERT_5),
    q('q2', 'Com que frequência você sentiu que não conseguia controlar as coisas importantes da sua vida?', LIKERT_5),
    q('q3', 'Com que frequência você se sentiu nervoso(a) e estressado(a)?', LIKERT_5),
    q('q4', 'Com que frequência você sentiu confiança na sua capacidade de lidar com problemas pessoais?', LIKERT_5),
    q('q5', 'Com que frequência você sentiu que as coisas estavam acontecendo do jeito que você queria?', LIKERT_5),
    q('q6', 'Com que frequência você achou que não conseguiria lidar com todas as coisas que você tinha que fazer?', LIKERT_5),
    q('q7', 'Com que frequência você conseguiu controlar as irritações na sua vida?', LIKERT_5),
    q('q8', 'Com que frequência você sentiu que estava no controle de tudo?', LIKERT_5),
    q('q9', 'Com que frequência você ficou bravo(a) por causa de coisas que aconteceram fora do seu controle?', LIKERT_5),
    q('q10', 'Com que frequência você sentiu que as dificuldades estavam se acumulando tanto que você não conseguia superá-las?', LIKERT_5),
  ],
  interpretations: [
    interp('i1', 0, 13, 'Estresse Baixo', 'Nível de estresse percebido baixo. Boa capacidade de enfrentamento.', '#22c55e'),
    interp('i2', 14, 26, 'Estresse Moderado', 'Nível de estresse moderado. Técnicas de manejo do estresse e suporte psicológico podem ser benéficos.', '#f97316'),
    interp('i3', 27, 40, 'Estresse Elevado', 'Nível elevado de estresse percebido. Intervenção psicológica e avaliação de fatores de risco recomendadas.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 3. PHQ-9 – Questionário de Saúde / Humor e Depressão
// ─────────────────────────────────────────────────────────────
const PHQ9 = {
  title: 'PHQ-9 – Avaliação de Humor e Depressão',
  description:
    'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por algum dos problemas abaixo? ' +
    'Este instrumento avalia sintomas depressivos e de alteração do humor.',
  questions: [
    q('q1', 'Pouco interesse ou pouco prazer em fazer as coisas', LIKERT_4),
    q('q2', 'Sentir-se para baixo, deprimido(a) ou sem perspectiva', LIKERT_4),
    q('q3', 'Dificuldade para adormecer ou permanecer dormindo, ou dormir mais do que de costume', LIKERT_4),
    q('q4', 'Sentir-se cansado(a) ou ter pouca energia', LIKERT_4),
    q('q5', 'Falta de apetite ou comer demais', LIKERT_4),
    q('q6', 'Sentir-se mal consigo mesmo(a) — ou achar que é um fracasso ou que decepcionou sua família ou você mesmo(a)', LIKERT_4),
    q('q7', 'Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão', LIKERT_4),
    q('q8', 'Mover-se ou falar tão lentamente que outras pessoas poderiam notar — ou ao contrário, ficar tão agitado(a) que você se mexia muito mais do que o normal', LIKERT_4),
    q('q9', 'Pensar em se machucar de alguma forma ou que seria melhor estar morto(a)', LIKERT_4),
  ],
  interpretations: [
    interp('i1', 0, 4, 'Depressão Mínima', 'Sintomas depressivos mínimos ou ausentes.', '#22c55e'),
    interp('i2', 5, 9, 'Depressão Leve', 'Sintomas leves. Monitoramento e estratégias de autocuidado recomendados.', '#84cc16'),
    interp('i3', 10, 14, 'Depressão Moderada', 'Sintomas moderados. Avaliação clínica e acompanhamento psicoterapêutico indicados.', '#eab308'),
    interp('i4', 15, 19, 'Depressão Moderada a Grave', 'Sintomas moderados a graves. Tratamento ativo recomendado.', '#f97316'),
    interp('i5', 20, 27, 'Depressão Grave', 'Sintomas graves. Encaminhamento e tratamento imediato recomendados.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 4. Inventário de Burnout (baseado no MBI simplificado)
// ─────────────────────────────────────────────────────────────
const BURNOUT = {
  title: 'Inventário de Burnout – MBI Simplificado',
  description:
    'Responda com que frequência você experimenta cada uma das situações abaixo em relação ao seu trabalho. ' +
    'Este instrumento avalia as três dimensões do esgotamento profissional.',
  questions: [
    // Exaustão Emocional
    q('q1', '[Exaustão] Sinto-me emocionalmente esgotado(a) pelo meu trabalho', LIKERT_5_BURNOUT),
    q('q2', '[Exaustão] Sinto-me desgastado(a) no final de um dia de trabalho', LIKERT_5_BURNOUT),
    q('q3', '[Exaustão] Sinto-me cansado(a) quando me levanto de manhã e tenho que enfrentar mais um dia de trabalho', LIKERT_5_BURNOUT),
    q('q4', '[Exaustão] Trabalhar com pessoas o dia todo me exige grande esforço', LIKERT_5_BURNOUT),
    q('q5', '[Exaustão] Sinto-me como se estivesse no limite das minhas forças', LIKERT_5_BURNOUT),
    // Despersonalização
    q('q6', '[Distanciamento] Sinto que trato alguns pacientes/clientes como se fossem objetos impessoais', LIKERT_5_BURNOUT),
    q('q7', '[Distanciamento] Tornei-me mais insensível com as pessoas desde que comecei este trabalho', LIKERT_5_BURNOUT),
    q('q8', '[Distanciamento] Preocupo-me com o fato de este trabalho estar me endurecendo emocionalmente', LIKERT_5_BURNOUT),
    q('q9', '[Distanciamento] Sinto que não me importo com o que acontece com alguns pacientes/clientes', LIKERT_5_BURNOUT),
    // Realização Profissional (pontuação invertida)
    q('q10', '[Realização] Consigo criar facilmente um ambiente tranquilo com as pessoas que atendo', LIKERT_5_BURNOUT),
    q('q11', '[Realização] Sinto-me estimulado(a) após trabalhar em contato com pessoas', LIKERT_5_BURNOUT),
    q('q12', '[Realização] Tenho realizado muitas coisas worthwhile neste trabalho', LIKERT_5_BURNOUT),
    q('q13', '[Realização] Sinto-me cheio(a) de energia no meu trabalho', LIKERT_5_BURNOUT),
    q('q14', '[Realização] Posso influenciar positivamente a vida de outras pessoas por meio do meu trabalho', LIKERT_5_BURNOUT),
    q('q15', '[Realização] Sinto-me muito ativo(a)/animado(a) no meu trabalho', LIKERT_5_BURNOUT),
  ],
  interpretations: [
    interp('i1', 0, 20, 'Sem Indicativo de Burnout', 'Sem sinais significativos de esgotamento profissional no momento.', '#22c55e'),
    interp('i2', 21, 35, 'Burnout Leve', 'Sinais iniciais de esgotamento. Estratégias preventivas e autocuidado recomendados.', '#eab308'),
    interp('i3', 36, 50, 'Burnout Moderado', 'Esgotamento moderado. Intervenção psicológica e revisão das condições de trabalho indicadas.', '#f97316'),
    interp('i4', 51, 60, 'Burnout Grave', 'Esgotamento profissional grave. Afastamento e tratamento psicológico urgentes recomendados.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 5. SNAP-IV Completo – TDAH (para pais/responsáveis)
// ─────────────────────────────────────────────────────────────
const SNAP_IV = {
  title: 'SNAP-IV – Questionário de TDAH para Pais/Responsáveis',
  description:
    'Por favor, avalie a criança ou adolescente de acordo com a frequência com que cada comportamento ocorre. ' +
    'Este questionário avalia sintomas de Transtorno do Déficit de Atenção e Hiperatividade (TDAH) e Transtorno Desafiador Opositivo (TOD).',
  questions: [
    // Desatenção (itens 1-9)
    q('q1', '1. Não consegue prestar muita atenção a detalhes ou comete erros por descuido nas tarefas escolares ou outras atividades', SNAP_OPTIONS),
    q('q2', '2. Tem dificuldade em manter a atenção em tarefas ou atividades de lazer', SNAP_OPTIONS),
    q('q3', '3. Parece não ouvir quando alguém fala diretamente com ele(a)', SNAP_OPTIONS),
    q('q4', '4. Não segue as instruções até o fim e não consegue terminar os trabalhos escolares (mas não devido à oposição ou falta de compreensão)', SNAP_OPTIONS),
    q('q5', '5. Tem dificuldade para organizar tarefas e atividades', SNAP_OPTIONS),
    q('q6', '6. Evita, não gosta ou é relutante em envolver-se em tarefas que exijam esforço mental prolongado', SNAP_OPTIONS),
    q('q7', '7. Perde coisas necessárias para tarefas ou atividades (brinquedos, deveres de casa, lápis, livros)', SNAP_OPTIONS),
    q('q8', '8. É facilmente distraído por estímulos externos', SNAP_OPTIONS),
    q('q9', '9. É esquecido em atividades diárias', SNAP_OPTIONS),
    // Hiperatividade/Impulsividade (itens 10-18)
    q('q10', '10. Agita as mãos ou os pés ou se remexe na cadeira', SNAP_OPTIONS),
    q('q11', '11. Sai do lugar na sala de aula ou em outras situações nas quais se espera que fique sentado', SNAP_OPTIONS),
    q('q12', '12. Corre ou sobe nas coisas de forma excessiva em situações impróprias', SNAP_OPTIONS),
    q('q13', '13. Tem dificuldade em brincar ou se envolver em atividades de lazer de forma calma', SNAP_OPTIONS),
    q('q14', '14. Está frequentemente "a mil" ou age como se fosse movido por um motor', SNAP_OPTIONS),
    q('q15', '15. Fala em excesso', SNAP_OPTIONS),
    q('q16', '16. Dá respostas precipitadas antes de as perguntas terem sido concluídas', SNAP_OPTIONS),
    q('q17', '17. Tem dificuldade para esperar a sua vez', SNAP_OPTIONS),
    q('q18', '18. Interrompe ou se intromete em situações (p.ex. mete-se nas conversas ou nos jogos dos outros)', SNAP_OPTIONS),
    // TOD (itens 19-26)
    q('q19', '19. Tem acessos de raiva', SNAP_OPTIONS),
    q('q20', '20. Discute com adultos', SNAP_OPTIONS),
    q('q21', '21. Desafia ativamente ou se recusa a cumprir pedidos ou regras de adultos', SNAP_OPTIONS),
    q('q22', '22. Incomoda as pessoas deliberadamente', SNAP_OPTIONS),
    q('q23', '23. Culpa os outros pelos seus próprios erros ou mau comportamento', SNAP_OPTIONS),
    q('q24', '24. É sensível ou facilmente incomodado pelos outros', SNAP_OPTIONS),
    q('q25', '25. É raivoso ou ressentido', SNAP_OPTIONS),
    q('q26', '26. É malicioso ou vingativo', SNAP_OPTIONS),
  ],
  interpretations: [
    interp('i1', 0, 17, 'Abaixo do ponto de corte', 'Pontuação total abaixo do nível clínico. Avalie subescalas individualmente.', '#22c55e'),
    interp('i2', 18, 35, 'Sintomas Sugestivos', 'Pontuação sugere presença de sintomas. Avaliação clínica completa recomendada.', '#eab308'),
    interp('i3', 36, 78, 'Sintomas Significativos', 'Pontuação elevada. Avaliação neuropsicológica e diagnóstica detalhada recomendada.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 6. M-CHAT-R/F Completo – Rastreio de Autismo (pais/responsáveis)
// ─────────────────────────────────────────────────────────────
const MCHAT = {
  title: 'M-CHAT-R/F – Rastreio de Autismo (16-30 meses)',
  description:
    'Por favor, responda às perguntas sobre o comportamento do seu filho(a). Considere como ele(a) geralmente se comporta. ' +
    'Se o comportamento ocorre raramente (p.ex., você viu 1 ou 2 vezes), responda como se ele(a) NÃO faz.',
  questions: [
    q('q1', '1. Se você aponta para algo do outro lado da sala, seu filho(a) olha para o que você está apontando?', SIM_NAO),
    q('q2', '2. Você já se perguntou se seu filho(a) pode ser surdo(a)?', SIM_NAO),
    q('q3', '3. Seu filho(a) brinca de faz de conta? (ex.: fingir beber em um copo vazio, falar ao telefone de brinquedo)', SIM_NAO),
    q('q4', '4. Seu filho(a) gosta de subir em coisas? (ex.: móveis, equipamento de playground)', SIM_NAO),
    q('q5', '5. Seu filho(a) faz movimentos incomuns com os dedos perto dos seus olhos? (ex.: agitar os dedos)', SIM_NAO),
    q('q6', '6. Seu filho(a) aponta com o dedo indicador para pedir algo ou para conseguir ajuda?', SIM_NAO),
    q('q7', '7. Seu filho(a) aponta com o dedo indicador para mostrar algo interessante?', SIM_NAO),
    q('q8', '8. Seu filho(a) se interessa por outras crianças?', SIM_NAO),
    q('q9', '9. Seu filho(a) mostra coisas trazendo para você ou segurando para você ver?', SIM_NAO),
    q('q10', '10. Seu filho(a) responde quando você o(a) chama pelo nome?', SIM_NAO),
    q('q11', '11. Quando você sorri para seu filho(a), ele(a) sorri de volta?', SIM_NAO),
    q('q12', '12. Seu filho(a) fica perturbado(a) com ruídos cotidianos?', SIM_NAO),
    q('q13', '13. Seu filho(a) sabe andar?', SIM_NAO),
    q('q14', '14. Seu filho(a) olha para seus olhos quando você fala com ele(a), brinca com ele(a) ou veste-o(a)?', SIM_NAO),
    q('q15', '15. Seu filho(a) tenta imitar o que você faz?', SIM_NAO),
    q('q16', '16. Se você virar a cabeça para olhar para alguma coisa, seu filho(a) olha em volta para ver o que você está olhando?', SIM_NAO),
    q('q17', '17. Seu filho(a) tenta fazer com que você o(a) olhe? (ex.: olha para você quando está brincando para obter seu elogio)', SIM_NAO),
    q('q18', '18. Seu filho(a) compreende quando você pede para ele(a) fazer alguma coisa?', SIM_NAO),
    q('q19', '19. Quando algo novo acontece, seu filho(a) olha para o seu rosto para ver como você reage?', SIM_NAO),
    q('q20', '20. Seu filho(a) gosta de atividades com movimento? (ex.: balançar, pular no colo)', SIM_NAO),
  ],
  interpretations: [
    interp('i1', 0, 2, 'Baixo Risco', 'Resultado dentro do esperado para a faixa etária. Continue com o acompanhamento de rotina.', '#22c55e'),
    interp('i2', 3, 7, 'Risco Médio', 'Resultado indica risco médio. A entrevista de acompanhamento (follow-up) é recomendada.', '#eab308'),
    interp('i3', 8, 20, 'Alto Risco', 'Resultado indica alto risco para autismo. Encaminhamento para avaliação diagnóstica especializada é fortemente recomendado.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 7. Rastreio Cognitivo – Neuropsicologia
// ─────────────────────────────────────────────────────────────
const RASTREIO_COGNITIVO = {
  title: 'Rastreio Cognitivo Breve – Neuropsicologia',
  description:
    'Instrumento de rastreio cognitivo para uso do profissional durante a avaliação. ' +
    'Avalia orientação, atenção, memória, linguagem e funções executivas.',
  questions: [
    // Orientação Temporal (5 pontos)
    q('q1', 'Orientação Temporal: O paciente sabe o ano atual corretamente?', SIM_NAO),
    q('q2', 'Orientação Temporal: O paciente sabe o mês atual corretamente?', SIM_NAO),
    q('q3', 'Orientação Temporal: O paciente sabe o dia da semana corretamente?', SIM_NAO),
    q('q4', 'Orientação Temporal: O paciente sabe a data (dia do mês) corretamente?', SIM_NAO),
    q('q5', 'Orientação Temporal: O paciente sabe a estação do ano?', SIM_NAO),
    // Orientação Espacial (5 pontos)
    q('q6', 'Orientação Espacial: O paciente sabe em qual país está?', SIM_NAO),
    q('q7', 'Orientação Espacial: O paciente sabe em qual estado/região está?', SIM_NAO),
    q('q8', 'Orientação Espacial: O paciente sabe em qual cidade está?', SIM_NAO),
    q('q9', 'Orientação Espacial: O paciente sabe onde está (local, bairro)?', SIM_NAO),
    q('q10', 'Orientação Espacial: O paciente sabe o andar/setor do local?', SIM_NAO),
    // Memória de Registro (3 pontos)
    q('q11', 'Memória de Registro: O paciente repetiu corretamente a 1ª palavra apresentada?', SIM_NAO),
    q('q12', 'Memória de Registro: O paciente repetiu corretamente a 2ª palavra apresentada?', SIM_NAO),
    q('q13', 'Memória de Registro: O paciente repetiu corretamente a 3ª palavra apresentada?', SIM_NAO),
    // Atenção e Cálculo (5 pontos)
    q('q14', 'Atenção/Cálculo: Subtração seriada 100-7 — 1ª resposta correta (93)?', SIM_NAO),
    q('q15', 'Atenção/Cálculo: 2ª resposta correta (86)?', SIM_NAO),
    q('q16', 'Atenção/Cálculo: 3ª resposta correta (79)?', SIM_NAO),
    q('q17', 'Atenção/Cálculo: 4ª resposta correta (72)?', SIM_NAO),
    q('q18', 'Atenção/Cálculo: 5ª resposta correta (65)?', SIM_NAO),
    // Memória de Evocação (3 pontos)
    q('q19', 'Memória de Evocação: Lembrou da 1ª palavra sem dica?', SIM_NAO),
    q('q20', 'Memória de Evocação: Lembrou da 2ª palavra sem dica?', SIM_NAO),
    q('q21', 'Memória de Evocação: Lembrou da 3ª palavra sem dica?', SIM_NAO),
    // Linguagem (5 pontos)
    q('q22', 'Linguagem: Nomeou os 2 objetos mostrados corretamente?', SIM_NAO),
    q('q23', 'Linguagem: Repetiu a frase "Nem aqui, nem ali, nem lá" corretamente?', SIM_NAO),
    q('q24', 'Linguagem: Executou o comando de 3 etapas corretamente (pegar papel, dobrar, colocar)?', SIM_NAO),
    q('q25', 'Linguagem: Leu e executou "Feche os olhos"?', SIM_NAO),
    q('q26', 'Linguagem: Escreveu uma frase completa com sentido?', SIM_NAO),
    // Praxia Construtiva (1 ponto)
    q('q27', 'Praxia Construtiva: Copiou o pentágono entrelaçado corretamente?', SIM_NAO),
    // Funções Executivas – perguntas adicionais
    q('q28', 'Fluência Verbal: Listou 10 ou mais animais em 60 segundos?', SIM_NAO),
    q('q29', 'Abstração: Explicou corretamente a semelhança entre "maçã e banana"?', SIM_NAO),
    q('q30', 'Controle Inibitório: Executou o comando inverso (bater 2 vezes quando o avaliador bate 1) sem erros?', SIM_NAO),
  ],
  interpretations: [
    interp('i1', 25, 30, 'Sem Indicativo de Déficit', 'Pontuação dentro do esperado. Função cognitiva preservada.', '#22c55e'),
    interp('i2', 20, 24, 'Possível Comprometimento Leve', 'Desempenho levemente abaixo do esperado. Avaliação neuropsicológica completa recomendada.', '#eab308'),
    interp('i3', 14, 19, 'Comprometimento Moderado', 'Déficit cognitivo moderado evidenciado. Investigação diagnóstica indicada.', '#f97316'),
    interp('i4', 0, 13, 'Comprometimento Significativo', 'Déficit cognitivo significativo. Encaminhamento neurológico/neuropsicológico urgente recomendado.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 8. Avaliação de Funções Executivas – Neuropsicologia
// ─────────────────────────────────────────────────────────────
const FUNCOES_EXECUTIVAS = {
  title: 'Questionário de Funções Executivas – BRIEF Adaptado',
  description:
    'Avaliação do comportamento relacionado às funções executivas no cotidiano. ' +
    'Para ser respondido pelo responsável ou pelo próprio paciente (adulto). ' +
    'Considera comportamentos observados nos últimos 6 meses.',
  questions: [
    // Controle Inibitório
    q('q1', '[Inibição] Age de forma impulsiva sem pensar nas consequências', LIKERT_4),
    q('q2', '[Inibição] Diz ou faz coisas sem pensar antes', LIKERT_4),
    q('q3', '[Inibição] Tem dificuldade em parar de fazer uma atividade quando solicitado', LIKERT_4),
    // Flexibilidade
    q('q4', '[Flexibilidade] Fica muito chateado(a) com mudanças de planos', LIKERT_4),
    q('q5', '[Flexibilidade] Tem dificuldade em mudar de uma atividade para outra', LIKERT_4),
    q('q6', '[Flexibilidade] Quando a situação muda, tem dificuldade em adaptar o comportamento', LIKERT_4),
    // Controle Emocional
    q('q7', '[Regulação Emocional] Reações emocionais são exageradas para a situação', LIKERT_4),
    q('q8', '[Regulação Emocional] Pequenas situações desencadeiam grandes reações emocionais', LIKERT_4),
    q('q9', '[Regulação Emocional] Tem dificuldade em se acalmar após uma situação perturbadora', LIKERT_4),
    // Memória de Trabalho
    q('q10', '[Memória de Trabalho] Esquece o que foi dito a ele(a) alguns minutos antes', LIKERT_4),
    q('q11', '[Memória de Trabalho] Perde o fio da meada no meio de uma tarefa', LIKERT_4),
    q('q12', '[Memória de Trabalho] Esquece instruções mesmo quando acabou de ouvir', LIKERT_4),
    // Planejamento e Organização
    q('q13', '[Planejamento] Tem dificuldade em iniciar tarefas ou projetos', LIKERT_4),
    q('q14', '[Planejamento] Não planeja com antecedência (ex.: trabalhos, viagens, tarefas)', LIKERT_4),
    q('q15', '[Organização] Tem materiais ou espaço de trabalho desorganizados', LIKERT_4),
    q('q16', '[Organização] Tem dificuldade em organizar tarefas com múltiplas etapas', LIKERT_4),
    // Monitoramento
    q('q17', '[Monitoramento] Não revisa o próprio trabalho em busca de erros', LIKERT_4),
    q('q18', '[Monitoramento] Não percebe o impacto do seu comportamento nos outros', LIKERT_4),
  ],
  interpretations: [
    interp('i1', 0, 18, 'Sem Comprometimento Executivo', 'Funções executivas preservadas no cotidiano.', '#22c55e'),
    interp('i2', 19, 30, 'Comprometimento Leve', 'Dificuldades executivas leves. Estratégias compensatórias e acompanhamento indicados.', '#eab308'),
    interp('i3', 31, 42, 'Comprometimento Moderado', 'Comprometimento moderado das funções executivas. Avaliação neuropsicológica completa recomendada.', '#f97316'),
    interp('i4', 43, 54, 'Comprometimento Significativo', 'Dificuldades executivas significativas impactando o cotidiano. Intervenção especializada indicada.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 9. Anamnese Escolar – Psicopedagogia
// ─────────────────────────────────────────────────────────────
const ANAMNESE_ESCOLAR = {
  title: 'Anamnese Escolar – Psicopedagogia',
  description:
    'Formulário de levantamento de dados escolares, familiares e do desenvolvimento para avaliação psicopedagógica. ' +
    'A ser preenchido pelo responsável pelo aluno.',
  questions: [
    { id: 'q1', text: 'Nome completo da criança/adolescente', type: 'text', required: true },
    { id: 'q2', text: 'Data de nascimento', type: 'text', placeholder: 'DD/MM/AAAA', required: true },
    { id: 'q3', text: 'Escola em que estuda atualmente', type: 'text', required: false },
    { id: 'q4', text: 'Ano/série que frequenta', type: 'text', required: false },
    { id: 'q5', text: 'Com quem a criança mora? (Ex.: pai e mãe, somente mãe, avós, etc.)', type: 'textarea', required: false },
    { id: 'q6', text: 'A criança já repetiu algum ano escolar?', type: 'radio', options: SIM_NAO, required: true },
    { id: 'q7', text: 'Se sim, em qual(is) ano(s)/série(s)?', type: 'text', required: false },
    { id: 'q8', text: 'Quais disciplinas apresentam mais dificuldade?', type: 'checkbox', options: [
      { label: 'Português / Língua Portuguesa', value: 'portugues' },
      { label: 'Matemática', value: 'matematica' },
      { label: 'Leitura', value: 'leitura' },
      { label: 'Escrita', value: 'escrita' },
      { label: 'Ciências', value: 'ciencias' },
      { label: 'Inglês', value: 'ingles' },
      { label: 'Todas as disciplinas', value: 'todas' },
    ], required: false },
    { id: 'q9', text: 'Como é o relacionamento da criança com os colegas de sala?', type: 'radio', options: [
      { label: 'Muito bom', value: 3 },
      { label: 'Bom', value: 2 },
      { label: 'Regular', value: 1 },
      { label: 'Ruim / apresenta conflitos', value: 0 },
    ], required: false },
    { id: 'q10', text: 'A criança apresenta dificuldades de leitura?', type: 'radio', options: SIM_NAO, required: true },
    { id: 'q11', text: 'A criança apresenta dificuldades de escrita?', type: 'radio', options: SIM_NAO, required: true },
    { id: 'q12', text: 'A criança apresenta dificuldades com matemática (contas, raciocínio lógico)?', type: 'radio', options: SIM_NAO, required: true },
    { id: 'q13', text: 'Há histórico de dificuldades escolares na família (pais, irmãos)?', type: 'radio', options: SIM_NAO, required: false },
    { id: 'q14', text: 'A criança já foi submetida a alguma avaliação anterior (psicológica, fonoaudiológica, neurológica)?', type: 'radio', options: SIM_NAO, required: false },
    { id: 'q15', text: 'Se sim, descreva os resultados ou diagnósticos obtidos:', type: 'textarea', required: false },
    { id: 'q16', text: 'A criança faz uso de algum medicamento? Qual?', type: 'textarea', required: false },
    { id: 'q17', text: 'Como foi o desenvolvimento da fala da criança?', type: 'radio', options: [
      { label: 'Dentro do esperado', value: 2 },
      { label: 'Atrasado', value: 1 },
      { label: 'Ainda apresenta dificuldades na fala', value: 0 },
    ], required: false },
    { id: 'q18', text: 'Descreva as principais queixas em relação ao desempenho escolar:', type: 'textarea', required: false },
    { id: 'q19', text: 'Quais atividades a criança mais gosta de fazer?', type: 'textarea', required: false },
    { id: 'q20', text: 'Alguma observação adicional que considere importante?', type: 'textarea', required: false },
  ],
  interpretations: [], // Anamnese qualitativa, sem pontuação
};

// ─────────────────────────────────────────────────────────────
// 10. Inventário de Dificuldades de Aprendizagem – Psicopedagogia
// ─────────────────────────────────────────────────────────────
const DIF_APRENDIZAGEM = {
  title: 'Inventário de Dificuldades de Aprendizagem – Psicopedagogia',
  description:
    'Avaliação das habilidades acadêmicas e dificuldades de aprendizagem. ' +
    'Responda de acordo com o desempenho observado da criança/adolescente.',
  questions: [
    // Leitura
    q('q1', '[Leitura] Lê palavras simples com fluência', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    q('q2', '[Leitura] Lê frases e textos curtos com compreensão', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    q('q3', '[Leitura] Confunde letras semelhantes durante a leitura (b/d, p/q, etc.)', LIKERT_5_BURNOUT),
    q('q4', '[Leitura] Lê de forma silabada ou lenta para a faixa etária', [
      { label: 'Nunca', value: 3 }, { label: 'Às vezes', value: 2 }, { label: 'Frequentemente', value: 1 }, { label: 'Sempre', value: 0 }
    ]),
    // Escrita
    q('q5', '[Escrita] Escreve palavras com ortografia adequada', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    q('q6', '[Escrita] Apresenta trocas de letras na escrita (ex.: f/v, s/z)', LIKERT_5_BURNOUT),
    q('q7', '[Escrita] Omite ou acrescenta letras nas palavras', LIKERT_5_BURNOUT),
    q('q8', '[Escrita] Consegue escrever textos curtos com sentido', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    // Matemática
    q('q9', '[Matemática] Realiza operações básicas (adição, subtração) adequadas à sua faixa etária', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    q('q10', '[Matemática] Compreende o conceito de quantidade e número', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    q('q11', '[Matemática] Resolve problemas matemáticos contextualizados', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
    // Atenção e Aprendizagem
    q('q12', '[Atenção] Mantém atenção durante atividades escolares', [
      { label: 'Sempre', value: 3 }, { label: 'Frequentemente', value: 2 }, { label: 'Às vezes', value: 1 }, { label: 'Raramente', value: 0 }
    ]),
    q('q13', '[Atenção] Distrai-se facilmente durante as tarefas', LIKERT_5_BURNOUT),
    q('q14', '[Memória] Retém informações aprendidas de uma aula para outra', [
      { label: 'Sempre', value: 3 }, { label: 'Às vezes', value: 2 }, { label: 'Raramente', value: 1 }, { label: 'Não retém', value: 0 }
    ]),
    q('q15', '[Organização] Organiza materiais e tarefas escolares adequadamente para a idade', [
      { label: 'Sempre', value: 3 }, { label: 'Com dificuldade', value: 2 }, { label: 'Com grande dificuldade', value: 1 }, { label: 'Não consegue', value: 0 }
    ]),
  ],
  interpretations: [
    interp('i1', 36, 45, 'Desempenho Adequado', 'Desempenho acadêmico dentro do esperado para a faixa etária.', '#22c55e'),
    interp('i2', 24, 35, 'Dificuldades Leves', 'Dificuldades leves de aprendizagem. Acompanhamento psicopedagógico e estratégias de intervenção recomendados.', '#eab308'),
    interp('i3', 12, 23, 'Dificuldades Moderadas', 'Dificuldades moderadas. Avaliação psicopedagógica aprofundada e plano de intervenção individualizado indicados.', '#f97316'),
    interp('i4', 0, 11, 'Dificuldades Significativas', 'Dificuldades significativas de aprendizagem. Avaliação multidisciplinar (psicopedagogo, fonoaudiólogo, neuropsicólogo) fortemente recomendada.', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 11. Habilidades de Leitura e Escrita – Psicopedagogia
// ─────────────────────────────────────────────────────────────
const LEITURA_ESCRITA = {
  title: 'Avaliação de Leitura e Escrita – Psicopedagogia',
  description:
    'Instrumento para avaliação das habilidades de leitura e escrita. Para uso do(a) psicopedagogo(a) durante a avaliação direta com o(a) aluno(a).',
  questions: [
    // Consciência Fonológica
    q('q1', '[Fon. Fonológica] Identifica rimas em palavras apresentadas oralmente', SIM_NAO),
    q('q2', '[Fon. Fonológica] Segmenta palavras em sílabas corretamente', SIM_NAO),
    q('q3', '[Fon. Fonológica] Identifica o som inicial de palavras', SIM_NAO),
    q('q4', '[Fon. Fonológica] Manipula fonemas (ex.: remove um som e forma nova palavra)', SIM_NAO),
    // Decodificação
    q('q5', '[Decodificação] Lê sílabas simples sem apoio', SIM_NAO),
    q('q6', '[Decodificação] Lê palavras regulares sem apoio', SIM_NAO),
    q('q7', '[Decodificação] Lê palavras irregulares sem apoio', SIM_NAO),
    q('q8', '[Decodificação] Lê pseudopalavras (palavras sem sentido)', SIM_NAO),
    // Fluência
    q('q9', '[Fluência] Lê um texto curto com fluidez adequada para a faixa etária', SIM_NAO),
    q('q10', '[Fluência] Realiza pausas e entonação adequadas na leitura', SIM_NAO),
    // Compreensão Leitora
    q('q11', '[Compreensão] Responde perguntas literais sobre texto lido', SIM_NAO),
    q('q12', '[Compreensão] Responde perguntas inferenciais sobre texto lido', SIM_NAO),
    q('q13', '[Compreensão] Identifica a ideia principal de um texto', SIM_NAO),
    q('q14', '[Compreensão] Faz previsões sobre o texto', SIM_NAO),
    // Escrita
    q('q15', '[Escrita] Copia palavras do quadro sem erros', SIM_NAO),
    q('q16', '[Escrita] Escreve palavras ditadas sem erros de troca', SIM_NAO),
    q('q17', '[Escrita] Produz frases escritas com sentido', SIM_NAO),
    q('q18', '[Escrita] Produz texto escrito com início, meio e fim', SIM_NAO),
    // Aspectos Grafomotores
    q('q19', '[Grafomotor] Apresenta caligrafia legível', SIM_NAO),
    q('q20', '[Grafomotor] Mantém espaçamento adequado entre palavras', SIM_NAO),
  ],
  interpretations: [
    interp('i1', 17, 20, 'Habilidades Preservadas', 'Habilidades de leitura e escrita dentro do esperado.', '#22c55e'),
    interp('i2', 12, 16, 'Dificuldades Leves', 'Áreas específicas merecem atenção. Intervenção psicopedagógica direcionada recomendada.', '#eab308'),
    interp('i3', 7, 11, 'Dificuldades Moderadas', 'Comprometimento moderado nas habilidades de linguagem escrita. Investigar possibilidade de dislexia ou outras DEAs.', '#f97316'),
    interp('i4', 0, 6, 'Dificuldades Significativas', 'Comprometimento significativo. Avaliação fonoaudiológica e neuropsicológica complementar indicada. Investigar DEA (dislexia, disortografia, disgrafia).', '#ef4444'),
  ],
};

// ─────────────────────────────────────────────────────────────
// 12. Escala de Comportamento de Humor (baseada no PANAS)
// ─────────────────────────────────────────────────────────────
const ESCALA_HUMOR = {
  title: 'Escala de Afeto e Humor – PANAS Adaptado',
  description:
    'Esta escala consiste em palavras que descrevem diferentes sentimentos e emoções. ' +
    'Indique em que medida você sentiu cada emoção durante a última semana.',
  questions: [
    // Afeto Positivo
    q('q1', 'Interessado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q2', 'Animado(a), entusiasmado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q3', 'Forte, ativo(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q4', 'Inspirado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q5', 'Determinado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q6', 'Atento(a), alerta', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q7', 'Orgulhoso(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q8', 'Entusiasmado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q9', 'Animado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q10', 'Amoroso(a), afetivo(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    // Afeto Negativo
    q('q11', 'Angustiado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q12', 'Chateado(a), perturbado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q13', 'Culpado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q14', 'Assustado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q15', 'Hostil, irritado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q16', 'Envergonhado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q17', 'Nervoso(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q18', 'Trêmulo(a), agitado(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q19', 'Com medo, receoso(a)', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
    q('q20', 'Infeliz, triste', [
      { label: 'Muito pouco ou nada', value: 1 }, { label: 'Um pouco', value: 2 }, { label: 'Moderadamente', value: 3 }, { label: 'Bastante', value: 4 }, { label: 'Extremamente', value: 5 }
    ]),
  ],
  interpretations: [
    interp('i1', 50, 100, 'Humor Predominantemente Positivo', 'Afeto positivo predominante, indicando bem-estar emocional.', '#22c55e'),
    interp('i2', 30, 49, 'Humor Equilibrado', 'Equilíbrio entre afetos positivos e negativos. Monitoramento recomendado.', '#eab308'),
    interp('i3', 20, 29, 'Afeto Negativo Predominante', 'Predomínio de afetos negativos. Avaliação clínica e suporte psicológico indicados.', '#ef4444'),
  ],
};

/**
 * Lista completa de formulários padrão
 * Cada item tem: title, description, questions, interpretations
 */
const DEFAULT_FORMS = [
  GAD7,
  PSS10,
  PHQ9,
  BURNOUT,
  ESCALA_HUMOR,
  SNAP_IV,
  MCHAT,
  RASTREIO_COGNITIVO,
  FUNCOES_EXECUTIVAS,
  ANAMNESE_ESCOLAR,
  DIF_APRENDIZAGEM,
  LEITURA_ESCRITA,
];

module.exports = { DEFAULT_FORMS };
