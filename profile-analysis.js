/* Учебное описание исходных ответов. Границы 2 и 4 — варианты ответа, не нормы. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.PsyProfileAnalysis = factory(root.PsyModel);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';

  const themes = [
    'интерес к новым знаниям',
    'удовольствие от решения сложных задач',
    'желание развивать свои способности',
    'стремление подтверждать свою значимость учебными успехами',
    'чувство долга, стыда или вины',
    'желание оправдать ожидания родителей',
    'стремление избежать неприятностей',
    'сомнения в интересе и смысле учёбы'
  ];
  const fmt = value => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(value);
  const join = values => values.length < 2 ? (values[0] || '') : values.slice(0,-1).join(', ') + ' и ' + values[values.length-1];
  const level = value => value >= 4 ? 'agreement' : value <= 2 ? 'disagreement' : 'between';

  function analyze(scores, answers) {
    if (!Array.isArray(scores) || scores.length !== 8 || scores.some(v => !Number.isFinite(v) || v < 1 || v > 5)) {
      throw new Error('Для разбора нужны восемь исходных средних от 1 до 5.');
    }
    let hasAnswers = false;
    if (answers !== undefined && answers !== null) {
      const checked = M.scoreAnswers(answers);
      if (checked.some((v,i) => Math.abs(v-scores[i]) > 0.000001)) throw new Error('Ответы и средние для разбора не совпадают.');
      hasAnswers = true;
    }
    const readings = M.SCALES.map((scale,i) => {
      const values = hasAnswers ? scale.items.map(number => answers[number-1]) : null;
      const mixed = !!values && values.some(v => v <= 2) && values.some(v => v >= 4);
      const status = level(scores[i]);
      const response = status === 'agreement'
        ? 'В среднем утверждения этой шкалы скорее соответствуют ответам.'
        : status === 'disagreement'
          ? 'В среднем утверждения этой шкалы скорее не соответствуют ответам.'
          : 'Среднее может объединять разные ответы. Полезно посмотреть на отдельные утверждения этой шкалы.';
      return {id:scale.id, label:scale.label, score:scores[i], status, meaning:scale.description, response, values, mixed, items:[...scale.items]};
    });

    const supported = scores.map((v,i) => v >= 4 ? i : -1).filter(i => i >= 0 && i < 7);
    const internal = supported.filter(i => i < 3);
    const external = supported.filter(i => i >= 3);
    const obligations = supported.filter(i => i >= 4);
    const mixed = readings.map((row,i) => row.mixed ? i : -1).filter(i => i >= 0);
    const equal = scores.every(v => Math.abs(v-scores[0]) < 0.000001);
    const allDeclined = scores.every(v => v <= 2);
    const strongAmotivation = scores[7] >= 4;
    let summary;

    if (equal) {
      summary = 'Все восемь шкал получили одинаковое среднее — ' + fmt(scores[0]) + ' из 5. По высоте точек здесь нельзя выделить одну причину учёбы. ';
      summary += scores[0] >= 4
        ? 'В среднем поддержаны и разные мотивы учиться, и утверждения о неясном смысле учёбы. Стоит уточнить, к каким ситуациям относятся эти ответы.'
        : scores[0] <= 2
          ? 'Утверждения всех шкал в среднем скорее не подходят. Это не позволяет заключить, что мотивации нет: собственные причины учиться стоит обсудить отдельно.'
          : 'Промежуточные средние сами по себе не описывают каждый отдельный ответ. Полезно посмотреть на конкретные утверждения.';
    } else if (allDeclined) {
      summary = 'Утверждения всех восьми шкал в среднем скорее не подходят. Самая высокая точка в таком профиле не становится «ведущим мотивом»: она тоже находится у отрицательных вариантов ответа. Какие причины учиться ты назвал бы своими словами?';
    } else {
      const sentences = [];
      if (internal.length) sentences.push('Ответы в среднем поддерживают ' + join(internal.map(i => themes[i])) + '.');
      if (external.length) sentences.push('Согласие в среднем получили утверждения о следующих причинах учиться: ' + join(external.map(i => themes[i])) + '.');
      if (strongAmotivation) sentences.push((supported.length ? 'Одновременно ' : 'В среднем ') + 'поддерживаются утверждения о недостатке интереса и неясном смысле учёбы. По этим баллам нельзя установить причину такого отношения.');
      else if (scores[7] <= 2) sentences.push('Утверждения об отсутствии интереса и смысла учёбы в среднем скорее не подходят.');
      if (!supported.length && !strongAmotivation) sentences.unshift('В профиле нет средних 4 и выше — у варианта «скорее соответствует» и выше. Поэтому отдельный пик не стоит автоматически называть главной причиной учёбы.');
      summary = sentences.join(' ');
    }

    const observations = [];
    const questions = [];
    function add(title, text, indices) { observations.push({title,text,indices}); }
    function question(text) { if (!questions.includes(text)) questions.push(text); }

    if (internal.length && strongAmotivation) {
      add('Интерес и сомнения в смысле', 'Согласие с внутренними причинами учёбы сосуществует с согласием по амотивации. Возможно, ответы относятся к разным предметам или ситуациям; по одному графику это не выяснить.', [...internal,7]);
      question('Что именно в учёбе интересно, а в каких занятиях трудно увидеть смысл?');
    } else if (strongAmotivation) {
      add('Смысл учёбы стоит обсудить', 'Среднее по амотивации находится у варианта «скорее соответствует» или выше. Это повод уточнить учебную ситуацию. Этот балл сам по себе не описывает лень, способности или состояние здоровья.', [7]);
      question('Какие занятия кажутся осмысленными, а какие трудно связать со своими целями?');
    }

    if (internal.length && obligations.length) {
      add('Интерес и «надо» рядом', 'В ответах одновременно поддержаны внутренние причины учиться и причины, связанные с долгом, ожиданиями или последствиями. Один мотив не отменяет другой. Их сочетание не говорит само по себе об усталости.', [...internal,...obligations]);
      question('Когда учёба привлекает сама по себе, а когда важнее долг, ожидания или возможные последствия?');
    } else if (internal.length && scores[3] >= 4) {
      add('Интерес и ощущение значимости', 'Помимо интереса к учебной деятельности, ответы поддерживают её связь с ощущением собственной значимости. Шкала самоуважения описывает причину учиться; уровень самооценки из неё не вычисляется.', [...internal,3]);
      question('Как ты оцениваешь свой учебный опыт, если результат пока ниже ожиданий?');
    } else if (external.length && !internal.length) {
      add('Какие причины получили согласие', 'Здесь средние 4 и выше получены по указанным внешним мотивам. Это не доказывает полного отсутствия интереса: каждый из внутренних мотивов нужно читать отдельно.', external);
    } else if (internal.length && !observations.length) {
      add('Что привлекает в самой учёбе', 'Указанные внутренние мотивы получили средние 4 и выше. Ответы поддерживают именно эти причины учиться. Баллы не определяют, хватит ли времени, энергии или помощи.', internal);
      question('Какие темы или задачи вызывают интерес даже без оценки и внешнего поощрения?');
    }

    if (equal && !observations.length) {
      add('Ровная линия тоже требует пояснения', 'Одинаковые средние не означают, что все мотивы имеют один смысл. Каждая точка получена из своей группы утверждений; линия только соединяет эти категории.', [0,7]);
    }
    if (!observations.length) {
      add('Пик описывает число, а не тип личности', 'Разница между точками помогает увидеть ответы по отдельным шкалам. Она сама по себе не доказывает устойчивого преобладания одного мотива. В приложении нет сравнения с нормативной выборкой.', [scores.indexOf(Math.max(...scores))]);
    }
    if (mixed.length) {
      add('За средним есть разные ответы', 'В указанных шкалах встречаются и ответы 1–2, и ответы 4–5. Среднее объединяет согласие и несогласие. Открой все восемь шкал и посмотри, какие утверждения оцениваются по-разному.', mixed);
      question('Почему одни утверждения внутри одной шкалы подходят, а другие — нет?');
    }
    if (scores[4] >= 4) question('В каких учебных ситуациях появляется чувство долга или вины?');
    if (scores[5] >= 4) question('Какие учебные цели ты выбрал бы независимо от ожиданий родителей?');
    if (scores[6] >= 4) question('Каких последствий ты стараешься избежать с помощью учёбы?');
    question('Какие конкретные ответы лучше всего отражают твои причины учиться сейчас?');
    question('Одинаково ли ты относишься ко всем предметам или многое зависит от ситуации?');

    return {summary, observations:observations.slice(0,3), questions:questions.slice(0,2), readings, equal, hasAnswers};
  }

  return Object.freeze({analyze});
});
