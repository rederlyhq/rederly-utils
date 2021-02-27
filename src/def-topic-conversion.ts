import WebWorkDef, { Problem } from '@rederly/webwork-def-parser';
import { webworkDateFormat, formatDateForWebwork } from '@rederly/webwork-def-parser/lib/date-util';
import * as _ from 'lodash';
import * as moment from 'moment';

export type DefFileTopicAssessmentInfo = Partial<{
    duration: number;
    hardCutoff: boolean;
    hideHints: boolean;
    hideProblemsAfterFinish: boolean;
    maxGradedAttemptsPerVersion: number;
    maxVersions: number;
    randomizeOrder: boolean;
    showItemizedResults: boolean;
    showTotalGradeImmediately: boolean;
    versionDelay: number;
}>

/**
 * TODO use shared interfaces once split out
 */
export interface RederlyTopic {
    // id: number;
    // courseUnitContentId: number;
    topicTypeId: number;
    // name: string;
    // contentOrder: number;
    startDate: Date;
    endDate: Date;
    deadDate: Date;
    partialExtend: boolean;
    topicAssessmentInfo?: DefFileTopicAssessmentInfo | null;
    questions: Array<RederlyQuestion>;
}

export interface RederlyQuestion {
    id: number;
    // courseTopicContentId: number;
    problemNumber: number;
    webworkQuestionPath: string;
    weight: number;
    maxAttempts: number;
    // hidden: boolean;
    courseQuestionAssessmentInfo?: RederlyQuestionAssessmentInfo | null;
}

export interface RederlyQuestionAssessmentInfo {
    // id: number;
    // courseWWTopicQuestionId: number;
    // curriculumQuestionAssessmentInfoId: number;
    randomSeedSet?: Array<number> | null;
    additionalProblemPaths?: Array<string> | null;
    // active: boolean;
}
/**
 * TODO use shared interfaces once split out ^^^^
 */


export interface GetTopicSettingsFromDefFileResult {
    topicAssessmentInfo?: DefFileTopicAssessmentInfo
}


export const getTopicSettingsFromDefFile  = (parsedWebworkDef: WebWorkDef): GetTopicSettingsFromDefFileResult => {
    let topicAssessmentInfo: DefFileTopicAssessmentInfo | undefined = undefined;
    let maxVersions: number | undefined;
    if (parsedWebworkDef.isExam()) {
        let possibleIntervals = 1;
        let timeInterval: number | undefined = undefined;
        if (!_.isNil(parsedWebworkDef.timeInterval)) {
            timeInterval = parseInt(parsedWebworkDef.timeInterval, 10);

            if (_.isNaN(timeInterval)) {
                throw new Error(`The def file has an invalid time interval: ${parsedWebworkDef.timeInterval}.`);
            }

            timeInterval /= 60;

            const rederlyAvailableVersions = parseInt(parsedWebworkDef.rederlyAvailableVersions ?? '', 10);
            if (!_.isNaN(rederlyAvailableVersions)) {
                maxVersions = rederlyAvailableVersions;
            }

            if (_.isNil(maxVersions) && !_.isNil(parsedWebworkDef.versionsPerInterval) && timeInterval > 0) {
                if (_.isNil(parsedWebworkDef.openDate) || _.isNil(parsedWebworkDef.dueDate)) {
                    throw new Error(`The def file is missing the open or due date.`);
                }
                const examDuration = moment(parsedWebworkDef.dueDate, webworkDateFormat).diff(moment(parsedWebworkDef.openDate, webworkDateFormat));
                // / 60000 to convert to minutes
                possibleIntervals = examDuration / 60000 / timeInterval;
                maxVersions = Math.round(parseInt(parsedWebworkDef.versionsPerInterval, 10) * possibleIntervals);
            }
            timeInterval = Math.round(timeInterval);
        }

        const rawTopicAssessmentInfo: DefFileTopicAssessmentInfo = {
            // courseTopicContentId: topic.id,
            duration: _.isNil(parsedWebworkDef.versionTimeLimit)  ? undefined : Math.round(parseInt(parsedWebworkDef.versionTimeLimit, 10) / 60),
            hardCutoff: _.isNil(parsedWebworkDef.capTimeLimit) ? undefined : WebWorkDef.numberBoolean(parsedWebworkDef.capTimeLimit),
            hideHints: undefined,
            hideProblemsAfterFinish: _.isNil(parsedWebworkDef.hideWork) ? undefined : WebWorkDef.characterBoolean(parsedWebworkDef.hideWork),
            maxGradedAttemptsPerVersion: _.isNil(parsedWebworkDef.attemptsPerVersion) ? undefined : parseInt(parsedWebworkDef.attemptsPerVersion, 10),
            maxVersions: maxVersions,//parsedWebworkDef.versionsPerInterval ?  : undefined,
            randomizeOrder: _.isNil(parsedWebworkDef.problemRandOrder) ? undefined: WebWorkDef.numberBoolean(parsedWebworkDef.problemRandOrder),
            showItemizedResults: _.isNil(parsedWebworkDef.hideScoreByProblem) ? undefined : !WebWorkDef.characterBoolean(parsedWebworkDef.hideScoreByProblem),
            showTotalGradeImmediately: _.isNil(parsedWebworkDef.hideScore) ? undefined: !WebWorkDef.characterBoolean(parsedWebworkDef.hideScore),
            versionDelay: timeInterval
        };
        topicAssessmentInfo = _.omitBy(rawTopicAssessmentInfo, _.isUndefined);
    }
    return {
        topicAssessmentInfo: topicAssessmentInfo
    };
};

export const getDefObjectFromTopic  = (topic: RederlyTopic): WebWorkDef => {
    const result = new WebWorkDef('');
    const isExam = topic.topicTypeId === 2;
    result.assignmentType = isExam ? 'gateway' : 'default';

    result.openDate = formatDateForWebwork(topic.startDate);
    result.dueDate = formatDateForWebwork(topic.endDate);
    result.reducedScoringDate = formatDateForWebwork(topic.deadDate);

    // result.openDate = moment(topic.startDate).format(webworkDateFormat);
    // result.dueDate = moment(topic.endDate).format(webworkDateFormat);
    // result.reducedScoringDate = moment(topic.deadDate).format(webworkDateFormat);
    

    result.answerDate = result.reducedScoringDate;
    result.enableReducedScoring = topic.partialExtend ? 'Y' : 'N';

    result.paperHeaderFile = '';
    result.screenHeaderFile = '';

    if (isExam && topic.topicAssessmentInfo !== undefined && topic.topicAssessmentInfo !== null) {
        result.attemptsPerVersion = topic.topicAssessmentInfo.maxGradedAttemptsPerVersion?.toString();
        result.timeInterval = ((topic.topicAssessmentInfo.versionDelay ?? 0) * 60).toString();
        result.versionsPerInterval = topic.topicAssessmentInfo.maxVersions?.toString();
        result.versionTimeLimit = ((topic.topicAssessmentInfo.duration ?? 0) * 60).toString();
        result.problemRandOrder = Number(topic.topicAssessmentInfo.randomizeOrder).toString();
        
        result.problemsPerPage = '0';
        result.hideScore = topic.topicAssessmentInfo.showTotalGradeImmediately ? 'N': 'Y';
        result.hideScoreByProblem = topic.topicAssessmentInfo.showItemizedResults ? 'N' : 'Y';
        result.hideWork = topic.topicAssessmentInfo.hideProblemsAfterFinish ? 'Y' : 'N';
        result.capTimeLimit = Number(topic.topicAssessmentInfo.hardCutoff).toString();

        result.rederlyAvailableVersions = topic.topicAssessmentInfo.maxVersions?.toString();
    }

    result.description = '';
    result.restrictProbProgression = '0';
    result.emailInstructor = '0';

    const questions = topic.questions.sort((a, b) => a.problemNumber - b.problemNumber);

    questions.forEach((question) => {
        const questionResult = new Problem();
        questionResult.problem_id = question.id.toString();
        questionResult.source_file = question.webworkQuestionPath
        questionResult.value = question.weight.toString();
        questionResult.max_attempts = question.maxAttempts.toString();

        questionResult.showMeAnother = '-1';
        questionResult.prPeriod = '-1';
        questionResult.counts_parent_grade = '0';
        questionResult.att_to_open_children = '0';

        if (isExam && question.courseQuestionAssessmentInfo !== undefined && question.courseQuestionAssessmentInfo !== null) {
            questionResult.rederlyAdditionalPaths = JSON.stringify(question.courseQuestionAssessmentInfo.additionalProblemPaths);
            questionResult.rederlyRandomSeedRestrictions = JSON.stringify(question.courseQuestionAssessmentInfo.randomSeedSet);
        }

        result.problems.push(questionResult);
    });
    return result;
}

export default {
    getTopicSettingsFromDefFile
}
