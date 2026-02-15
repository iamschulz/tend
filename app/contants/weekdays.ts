import type { TranslateFunction } from '~/types/TranslateFunction'

export const getWeekdays = (t: TranslateFunction) => [
    { short: t('weekdayMoShort'), full: t('weekdayMo') },
    { short: t('weekdayTuShort'), full: t('weekdayTu') },
    { short: t('weekdayWeShort'), full: t('weekdayWe') },
    { short: t('weekdayThShort'), full: t('weekdayTh') },
    { short: t('weekdayFrShort'), full: t('weekdayFr') },
    { short: t('weekdaySaShort'), full: t('weekdaySa') },
    { short: t('weekdaySuShort'), full: t('weekdaySu') },
];
