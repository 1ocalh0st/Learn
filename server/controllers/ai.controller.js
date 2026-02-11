const aiService = require("../services/ai.service");

// AI生成测试用例 (预留接口)
async function generateTestCases(req, res) {
    try {
        const { requirementDoc, projectId, options } = req.body;

        if (!requirementDoc || !projectId) {
            return res.status(400).json({
                code: "VALIDATION_ERROR",
                message: "requirementDoc and projectId are required"
            });
        }

        const result = await aiService.generateTestCases(
            requirementDoc,
            projectId,
            options || {}
        );

        if (!result.success) {
            return res.status(501).json({
                code: "NOT_IMPLEMENTED",
                message: result.message
            });
        }

        return res.json({
            code: "OK",
            message: "测试用例生成成功",
            data: result.generatedCases
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            code: "SERVER_ERROR",
            message: "服务器错误"
        });
    }
}

module.exports = {
    generateTestCases
};
