-- Increment KB Article View Count
CREATE OR REPLACE FUNCTION increment_kb_view(article_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE kb_articles 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
