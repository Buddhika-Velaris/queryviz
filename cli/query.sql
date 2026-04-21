WITH matching_tickets AS (
  SELECT t.id
  FROM client_template.ticket t
  WHERE t.archived = 0
  AND (
    t.ticket_id ILIKE '%a%'
    OR EXISTS (
      SELECT 1
      FROM client_template.ticket_update_data tud
      WHERE tud.ticket_table_id = t.id
      AND tud.archived = 0
      AND tud.type = 19
      AND tud.data ILIKE '%a%'
    )
  )
),
base_tickets AS (
  SELECT
    t.id,
    t.ticket_id AS "ticketId",
    t.external_id AS "externalId",
    t.ticket_url AS "ticketUrl",
    t.created,
    t.modified,
    t.custom_data AS "customData",
    t.archived,
    satd.sentiment,
    satd.sentiment_accuracy,
    satd.lang,
    CASE t.channel
      WHEN 11 THEN 'email'
      WHEN 12 THEN 'phone'
      WHEN 13 THEN 'chat'
      WHEN 14 THEN 'portal'
      WHEN 15 THEN 'api'
      WHEN 36 THEN 'web'
      ELSE NULL
    END AS "channel",
    CASE t.origin
      WHEN 16 THEN 'zendesk'
      WHEN 17 THEN 'intercom'
      WHEN 18 THEN 'freshdesk'
      WHEN 27 THEN 'jira'
      WHEN 41 THEN 'hubspot'
      WHEN 47 THEN 'salesforce'
      WHEN 48 THEN 'plain'
      WHEN 49 THEN 'crisp'
      WHEN 50 THEN 'pylon'
      WHEN 51 THEN 'linear'
      WHEN 84 THEN 'live_agent'
      WHEN 117 THEN 'service_now'
      ELSE NULL
    END AS "origin"
  FROM client_template.ticket t
  INNER JOIN matching_tickets mt
    ON mt.id = t.id
  LEFT JOIN LATERAL (
    SELECT
      tad.sentiment,
      tad.sentiment_accuracy,
      tad.lang
    FROM client_template.ticket_text_analysis_data ttad
    INNER JOIN client_template.text_analysis_data tad
      ON ttad.text_analysis_id = tad.text_analysis_id
    WHERE ttad.ticket_id = t.id
    ORDER BY tad.text_analysis_id DESC
    LIMIT 1
  ) satd ON TRUE
  WHERE t.archived = 0
  AND EXISTS (
    SELECT 1
    FROM client_template.ticket_update_data tudsi
    WHERE tudsi.ticket_table_id = t.id
    AND tudsi.archived = 0
    AND tudsi.type IN (1, 2, 3, 4)
  )
)
SELECT *
FROM base_tickets
ORDER BY modified DESC, id DESC
LIMIT 20 OFFSET 0;