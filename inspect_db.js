const mongoose = require('mongoose');

async function run() {
    await mongoose.connect('mongodb://127.0.0.1:27017/vocab-learner', { useNewUrlParser: true });

    // Lazy load models
    const QuizAttemptSchema = new mongoose.Schema({
        _qMemo: { type: Object }
    }, { strict: false });
    const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', QuizAttemptSchema);

    const QuizAnswerSchema = new mongoose.Schema({
        attemptId: String,
        wordId: String,
        selectedOption: String,
        isCorrect: Boolean,
        isTimeout: Boolean
    }, { strict: false });
    const QuizAnswer = mongoose.models.QuizAnswer || mongoose.model('QuizAnswer', QuizAnswerSchema);

    // Get the most recent 2 attempts
    const attempts = await QuizAttempt.find().sort({ startedAt: -1 }).limit(2).lean();

    for (const att of attempts) {
        console.log(`\nAttempt ID: ${att._id}`);
        console.log('_qMemo:', JSON.stringify(att._qMemo, null, 2));

        const answers = await QuizAnswer.find({ attemptId: att._id }).sort({ answeredAt: -1 }).limit(3).lean();
        console.log('Recent Answers for this attempt:');
        for (const ans of answers) {
            console.log(` - WordID: ${ans.wordId} | Selected: ${ans.selectedOption} | isCorrect: ${ans.isCorrect} | isTimeout: ${ans.isTimeout}`);
            if (att._qMemo) {
                console.log(`   -> Expected (from memo): ${att._qMemo[ans.wordId]}`);
            }
        }
    }

    process.exit(0);
}

run().catch(console.error);
