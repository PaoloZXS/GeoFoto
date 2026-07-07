<%@ Page Language="C#" %>
<%@ Import Namespace="System.IO" %>
<script runat="server">
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Request.HttpMethod != "POST")
        {
            Response.StatusCode = 405;
            Response.Write("POST required");
            return;
        }

        try
        {
            string cliente = Request.Form["cliente"] ?? "Sconosciuto";
            HttpPostedFile file = Request.Files["foto"];

            if (file == null || file.ContentLength == 0)
            {
                Response.StatusCode = 400;
                Response.Write("Nessun file");
                return;
            }

            // Pulisci nome cliente
            foreach (char c in Path.GetInvalidFileNameChars())
                cliente = cliente.Replace(c.ToString(), "");

            string dir = @"C:\InterventiWeb\FotoLavori\" + cliente;
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            string filename = DateTime.Now.ToString("ddMMyyyyHHmmss") + ".jpg";
            string path = Path.Combine(dir, filename);
            file.SaveAs(path);

            Response.Write("OK");
        }
        catch (Exception ex)
        {
            Response.StatusCode = 500;
            Response.Write(ex.Message);
        }
    }
</script>
