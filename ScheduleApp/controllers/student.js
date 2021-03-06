const STUDENT = require('../models/student');

exports.getStudentsBySearch = function (req, res, next) {
    const term = req.params.term;
    const names = req.params[0].split('/');

    for (let i = 0; i < names.length; i++) {
        names[i] = names[i].toUpperCase();
    }

    STUDENT.aggregate([{
        $match: {
            $and: [{
                term: term
            }, {
                username: {
                    $in: names
                }
            }]
        }
    }, {
        $lookup: {
            from: "lookup",
            localField: "term",
            foreignField: "termKey",
            as: "terms"
        }
    }, {
        $project: {
            term: 1,
            username: 1,
            name: 1,
            year: 1,
            graduationDate: 1,
            minors: 1,
            majors: 1,
            advisor: 1,
            terms: 1,
        }
    }], (err, students) => {
        if (err) {
            handleError('Bad request!', res, 400, next);
        } else {
            try {
                const data = students;

                const studentArray = [];
                for (let i = 0; i < data.length; i++) {
                    const advisor = getAdvisorStudentInfoTerm(data[i].advisor[0]);
                    const terms = getTermsStudentInfoTerm(data[i].terms);
                    const majorStr = createMajorsString(data[i].majors);
                    const minorStr = createMinorsString(data[i].minors);
                    const newStudent = createStudentInfoTerm(data[i], advisor, terms, [], majorStr, minorStr);
                    studentArray.push(newStudent);
                }

                res.status(200);
                res.json(studentArray);
            } catch (error) {
                handleError('Could not find student information for given term', res, 404, next);
            }
        }
    });
};

exports.getStudentInfoByTerm = function (req, res, next) {
    const username = req.params.username.toUpperCase();
    const term = req.params.term;

    STUDENT.aggregate([{
        $match: {
            $and: [{
                term: term
            }, {
                username: username
            }]
        }
    }, {
        $lookup: {
            from: "lookup",
            localField: "courses",
            foreignField: "name",
            as: "courseData"
        }
    }, {
        $lookup: {
            from: "lookup",
            localField: "username",
            foreignField: "username",
            as: "userTerms"
        }
    }, {
        $lookup: {
            from: "lookup",
            localField: "userTerms.term",
            foreignField: "termKey",
            as: "terms"
        }
    }, {
        $lookup: {
            from: "lookup",
            localField: "username",
            foreignField: "members",
            as: "groups"
        }
    }, {
        $lookup: {
            from: "lookup",
            localField: "groups.members",
            foreignField: "username",
            as: "groupMembers"
        }
    }, {
        $project: {
            term: 1,
            username: 1,
            name: 1,
            year: 1,
            graduationDate: 1,
            minors: 1,
            majors: 1,
            advisor: 1,
            groups: 1,
            groupMembers: 1,
            terms: 1,
            courses: {
                $filter: {
                    input: '$courseData',
                    as: 'course',
                    cond: {
                        $eq: ['$$course.term', term]
                    }
                }
            }
        }
    }], (err, student) => {
        if (err) {
            handleError('Bad request!', res, 400, next);
        } else {
            try {
                const data = student[0];
                const terms = getTermsStudentInfoTerm(data.terms);
                const courses = getCoursesStudentInfoTerm(data.courses);
                const groups = getGroupsStudentInfoTerm(data.groups, data.groupMembers, data.term);
                const majorStr = createMajorsString(data.majors);
                const minorStr = createMinorsString(data.minors);
                const newStudent = createStudentInfoTerm(data, terms, groups, courses, majorStr, minorStr);

                res.status(200);
                res.json([newStudent]);
            } catch (error) {
                handleError('Could not find student information for given term', res, 404, next);
            }
        }
    });
};

exports.getStudentInfo = function (req, res, next) {
    const username = req.params.username.toUpperCase();

    STUDENT.aggregate([{
        $match: {
            username: username
        }
    }, {
        $lookup: {
            from: 'lookup',
            localField: 'courses',
            foreignField: 'name',
            as: 'courses'
        }
    }, {
        $lookup: {
            from: 'lookup',
            localField: 'term',
            foreignField: 'termKey',
            as: 'term'
        }
    }, {
        $project: {
            username: 1,
            name: 1,
            term: 1,
            graduationDate: 1,
            courses: 1
        }
    }], (err, studentInfo) => {
        if (err) {
            handleError('Bad request!', res, 400, next);
        } else {
            try {
                const newStudentInfo = [];

                for (let i = 0; i < studentInfo.length; i++) {
                    const student = studentInfo[i];
                    const term = student.term[0].termKey;
                    const termInfo = getTermsStudentInfoTerm(student.term);
                    const courses = getCoursesStudentInfo(student.courses, term);
                    const info = createStudentInfo(student, termInfo, courses);
                    newStudentInfo.push(info);
                }

                res.status(200);
                res.json(newStudentInfo);
            } catch (error) {
                handleError('Could not find student information', res, 404, next);
            }
        }
    });
};

function createStudentInfo(data, term, courses) {
    return {
        term: term,
        username: data.username,
        name: data.name,
        graduationDate: data.graduationDate,
        courses: courses
    };
}

function createStudentInfoTerm(data, terms, groups, courses, majorStr, minorStr) {
    return {
        term: data.term,
        username: data.username,
        name: data.name,
        year: data.year,
        majors: majorStr,
        minors: minorStr,
        graduationDate: data.graduationDate,
        advisor: data.advisor,
        terms: terms,
        groups: groups,
        courses: courses
    };
}

function getAdvisorStudentInfoTerm(advisor) {
    return advisor ? advisor.username : '';
}

function getTermsStudentInfoTerm(terms) {
    const termsArr = [];
    for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        const termName = getTermName(term.termKey);
        termsArr.push({
            term: term.termKey,
            name: termName,
            startDate: term.startDate,
            endDate: term.endDate
        });
    }

    return termsArr;
}

function getTermName(key) {
    const year = key.substring(0, 4);
    const term = key.substring(4);
    switch (term) {
        case '10':
            return `Fall ${year}`;
        case '20':
            return `Winter ${year}`;
        case '30':
            return `Spring ${year}`;
        default:
            return `Summer ${year}`;
    }
}

function getGroupsStudentInfoTerm(groups, groupMembers, term) {
    const groupsArr = [];

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        if (group.term === term) {
            const members = [];

            for (let j = 0; j < group.members.length; j++) {
                const member = group.members[j];
                const info = getGroupMemberInfo(member, groupMembers, term);
                members.push(info);
            }

            groupsArr.push({
                _id: group._id,
                groupName: group.groupName,
                members: members,
                description: group.description,
                forClass: group.forClass
            });
        }
    }

    return groupsArr;
}

function getGroupMemberInfo(member, groupMembers, term) {
    for (let i = 0; i < groupMembers.length; i++) {
        if (member === groupMembers[i].username && term === groupMembers[i].term) {
            return {
                username: member,
                type: groupMembers[i].type
            };
        }
    }
    return;
}

function getCoursesStudentInfo(courses, term) {
    const coursesArr = [];

    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        if (course.term === term) {
            coursesArr.push({
                name: course.name,
                description: course.description,
                creditHours: course.creditHours,
                meetTimes: course.meetTimes,
                instructor: course.instructor
            });
        }
    }

    return coursesArr;
}

function getCoursesStudentInfoTerm(courses) {
    const coursesArr = [];

    for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        coursesArr.push({
            name: course.name,
            term: course.term,
            description: course.description,
            creditHours: course.creditHours,
            meetTimes: course.meetTimes,
            instructor: course.instructor
        });
    }

    return coursesArr;
}

function createMajorsString(majors) {
    let majorStr = '';

    majors.pop();

    for (let i = 0; i < majors.length; i++) {
        majorStr += `${majors[i]}`;
        if (i + 1 < majors.length) {
            majorStr += '/';
        }
    }

    return majorStr;
}

function createMinorsString(minors) {
    let minorStr = '';

    minors.pop();

    for (let i = 0; i < minors.length; i++) {
        minorStr += `${minors[i]}`;
        if (i + 1 < minors.length) {
            minorStr += '/';
        }
    }

    return minorStr;
}

function handleError(err, res, statusCode, next) {
    res.status(statusCode);
    err.status = statusCode;
    console.log(err);
    next(err);
}