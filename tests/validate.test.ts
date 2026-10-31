import { describe, expect, it } from 'vitest';
import { validatePackage } from '../src/content/validate';
import { checkContentUrl } from '../src/content/urls';
import { clone, demoPackage, demoVideoMap } from './helpers';

const fields = (r: ReturnType<typeof validatePackage>) => r.issues.filter((i) => i.level === 'error').map((i) => `${i.record}|${i.field}`);

describe('перевірка імпорту', () => {
  it('демонстраційний набір проходить перевірку', () => {
    const r = validatePackage(demoPackage(), demoVideoMap());
    expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(r.report).toMatchObject({ questionCount: 22, keysCount: 22, maxPoints: 32, textExplanations: 22, videoBindings: 2 });
  });

  it('дубльований id питання', () => {
    const p = clone(demoPackage());
    p.questions[1].id = p.questions[0].id;
    expect(fields(validatePackage(p, null))).toContain('questions[1]|id');
  });

  it('невідоме питання в порядку та питання поза порядком', () => {
    const p = clone(demoPackage());
    p.simulation.orderedQuestionIds[3] = 'nope';
    const f = fields(validatePackage(p, null));
    expect(f).toContain('симуляція «nmt-23»|orderedQuestionIds[3]');
    expect(f).toContain('питання «nmt23-q04»|id');
  });

  it('ключ, що не відповідає варіантам', () => {
    const p = clone(demoPackage());
    (p.questions[0] as any).answerKey.optionId = 'nmt23-q01-o9';
    expect(fields(validatePackage(p, null))).toContain('питання «nmt23-q01»|answerKey.optionId');
  });

  it('відповідності: кількість рядків, повтор варіанта, явне правило повторів', () => {
    const p = clone(demoPackage());
    const q = p.questions[15] as any;
    q.answerKey.pairs[q.matchingRows[1].id] = q.answerKey.pairs[q.matchingRows[0].id];
    delete q.allowOptionReuse;
    q.matchingRows.pop();
    const f = fields(validatePackage(p, null));
    expect(f).toContain('питання «nmt23-q16»|allowOptionReuse');
    expect(f).toContain('питання «nmt23-q16»|matchingRows');
    expect(f).toContain('питання «nmt23-q16»|maxPoints');
  });

  it('сума балів і кількість питань відповідно до профілю', () => {
    const p = clone(demoPackage());
    p.questions.pop();
    p.simulation.orderedQuestionIds.pop();
    const f = fields(validatePackage(p, null));
    expect(f).toContain('симуляція «nmt-23»|orderedQuestionIds');
    expect(f).toContain('симуляція «nmt-23»|maxPoints');
  });

  it('помилка у формулі вказує поле', () => {
    const p = clone(demoPackage());
    p.questions[2].statement = 'Обчисліть $\\frac{1}{$';
    expect(fields(validatePackage(p, null))).toContain('питання «nmt23-q03»|statement');
  });

  it('демонстраційний набір не може видавати себе за №23', () => {
    const p = clone(demoPackage());
    p.simulation.isDemo = true;
    p.simulation.readiness = 'demo';
    p.simulation.title = 'Симуляція НМТ №23';
    expect(fields(validatePackage(p, null))).toContain('симуляція «nmt-23»|title');
  });

  it('карта відео: пропущені, зайві, дубльовані та невідомі прив’язки', () => {
    const vm = clone(demoVideoMap());
    vm.bindings.push({ questionId: 'nmt23-q03', explanationVideoId: 'demo-clip-a' });
    vm.bindings.push({ questionId: 'nmt23-q01', explanationVideoId: 'demo-clip-b' });
    vm.bindings.push({ questionId: 'ghost', explanationVideoId: 'demo-clip-b' });
    vm.media.push({ id: 'demo-extra', kind: 'video', publicUrl: 'media/x.mp4', readiness: 'ready' });
    const r = validatePackage(demoPackage(), vm);
    const msgs = r.issues.map((i) => `${i.level}|${i.field}|${i.message}`);
    expect(msgs.some((m) => m.startsWith('error|bindings[2].explanationVideoId') && m.includes('уже прив’язане'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('error|bindings[3].questionId') && m.includes('двічі'))).toBe(true);
    expect(msgs.some((m) => m.startsWith('error|bindings[4].questionId') && m.includes('зайва'))).toBe(true);
    expect(r.issues.some((i) => i.level === 'warning' && i.record === 'відео «demo-extra»')).toBe(true);
    expect(r.issues.some((i) => i.level === 'warning' && i.record === 'питання «nmt23-q04»' && i.field === 'відео')).toBe(true);
  });

  it('карта відео іншої симуляції відхиляється', () => {
    const vm = clone(demoVideoMap());
    vm.simulationId = 'nmt-24';
    expect(fields(validatePackage(demoPackage(), vm))).toContain('карта відео|simulationId');
  });

  it('небезпечні адреси', () => {
    for (const u of ['javascript:alert(1)', 'JaVaScRiPt:x', ' java\tscript:x', 'data:text/html,1', 'http://x.com/a.mp4', '//evil.com/a', '/etc/passwd', 'C:/Users/me/v.mp4', 'C:\\v.mp4', '../secret', 'https://u:p@host/x']) {
      expect(checkContentUrl(u), u).not.toBeNull();
    }
    expect(checkContentUrl('https://cdn.example.com/v/q1.mp4')).toBeNull();
    expect(checkContentUrl('assets/fig.svg')).toBeNull();
    const p = clone(demoPackage());
    p.questions[4].assets![0].src = 'javascript:alert(1)';
    expect(fields(validatePackage(p, null))).toContain('питання «nmt23-q05»|assets[0].src');
  });

  it('таблиця переведення: повнота і діапазон', () => {
    const p = clone(demoPackage());
    p.conversionTables = [{ id: 't', year: 2026, source: 'x', maxPrimary: 32, map: { '0': null, '1': 250 } }];
    p.simulation.conversionTableId = 't';
    const f = fields(validatePackage(p, null));
    expect(f).toContain('таблиця переведення «t»|map.1');
    expect(f).toContain('таблиця переведення «t»|map.2');
  });
});

describe('відеопояснення з редактора', () => {
  it('Bunny і файл проходять, некоректні — ні', () => {
    const p = clone(demoPackage());
    p.questions[0].video = { provider: 'bunny', libraryId: '123456', videoId: '0f1e2d3c-4b5a-6978-8a9b-acbdcedfe0f1' };
    p.questions[1].video = { provider: 'file', src: 'https://x.supabase.co/storage/v1/object/public/content/a.mp4' };
    expect(fields(validatePackage(p, demoVideoMap()))).toEqual([]);
    p.questions[0].video = { provider: 'bunny', libraryId: 'abc', videoId: 'nope' };
    p.questions[1].video = { provider: 'file', src: 'javascript:alert(1)' };
    const f = fields(validatePackage(p, demoVideoMap()));
    expect(f.some((x) => x.endsWith('video.libraryId'))).toBe(true);
    expect(f.some((x) => x.endsWith('video.videoId'))).toBe(true);
    expect(f.some((x) => x.endsWith('video.src'))).toBe(true);
  });
});
