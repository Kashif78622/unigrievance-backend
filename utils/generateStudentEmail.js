const Settings = require("../models/SystemSettings");

const generateStudentEmail = async (user) => {
    const settings = await Settings.findOne();

    if (!settings) throw new Error("System settings not found");

    if (!user.department || !user.department.tag) {
        throw new Error("Department not populated");
    }

    const uniTag = settings.universityTag;
    const domain = settings.universityDomain;

    const deptTag = user.department.tag;
    const roll = user.rollNumber.padStart(3, "0");

    return `${uniTag}-${deptTag}-f${user.sessionYear}-${roll}@students.${domain}`;
};

module.exports = generateStudentEmail;