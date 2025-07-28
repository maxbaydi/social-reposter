const Template = require('../db/models/Template');

exports.getTemplates = async (req, res) => {
    try {
        const templates = await Template.findAll({ where: { userId: req.user.id } });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.createTemplate = async (req, res) => {
    const { name, content, platforms, utm } = req.body;
    try {
        const template = await Template.create({
            userId: req.user.id,
            name,
            content,
            platforms,
            utm,
        });
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    const { name, content, platforms, utm } = req.body;
    try {
        const template = await Template.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        template.name = name;
        template.content = content;
        template.platforms = platforms;
        template.utm = utm;
        
        await template.save();
        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

exports.deleteTemplate = async (req, res) => {
     try {
        const template = await Template.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        await template.destroy();
        res.json({ message: 'Template removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
}; 