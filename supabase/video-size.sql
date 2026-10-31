-- Відео до 50 МБ у кошику content (раніше було 20 МБ). Виконати один раз у SQL Editor.
update storage.buckets set file_size_limit = 52428800 where id = 'content';
